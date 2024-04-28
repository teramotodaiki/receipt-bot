/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { analyze } from './analyze';
import { appendToSheet } from './spreadsheet';

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		if (request.method === 'GET') {
			return new Response('Hello world!');
		}

		const json = await request.json();

		const event = json.events[0];
		if (!event || event.type !== 'message' || event.message.type !== 'image') {
			return new Response('Hello world!');
		}

		ctx.waitUntil(
			(async function task() {
				const replyToken = event.replyToken;
				const messageId = event.message.id;

				const imageResponse = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
					headers: {
						Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`,
					},
				});
				const image = await imageResponse.arrayBuffer();

				const receipt = await analyze(image, env);

				const text = [
					receipt.date,
					receipt.merchant,
					...receipt.items.map((item) => `${item.name} ¥${item.price}`),
					'¥' + receipt.subTotal,
					'¥' + receipt.total + ' (税込)',
				].join('\n');

				const lineRes = await fetch('https://api.line.me/v2/bot/message/reply', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`,
					},
					body: JSON.stringify({
						replyToken,
						messages: [
							{
								type: 'text',
								text,
							},
						],
					}),
				});
				console.log(await lineRes.text());

				// Google Spreadsheetに書き込む
				const rows = receipt.items.map((item) => [receipt.date, receipt.merchant, item.name, item.price]);
				const googleRes = await appendToSheet(env, 'data', rows);
				console.log(await googleRes.text());
			})()
		);
		return new Response('Hello world!');
	},
};
