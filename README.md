# レシートボット

レシートに写真をアップロードすると、買ったものをスプレッドシートに記録してくれる LINE Bot。

さらに LLM で勘定項目を推定すれば、自動で家計簿が作れる

| LINE Bot にアップロード                                                          | Google SpreadSheet に自動転機                                                                                                       |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| <img src="https://i.gyazo.com/1107de94a3b46d53ec5765e25a5813fc.jpg" width="200"> | [![Image from Gyazo](https://i.gyazo.com/5f3e73606f328ca8da9a29ec1c58b38a.png)](https://gyazo.com/5f3e73606f328ca8da9a29ec1c58b38a) |

## 使い方

Cloudflare Workers で動かすことを想定している

## Cloudflare

- `npm run deploy` で Cloudflare Workers にデプロイ

## Azure AI Service

https://azure.microsoft.com/ja-jp/products/ai-services/ai-document-intelligence

- ここから Azure AI Service のリソースを作成する
- エンドポイントとキーを `AZURE_ENDPOINT` と `AZURE_SUBCRIPTION_KEY` に設定

> [!IMPORTANT]
> レシートの読み取りには 1000 枚あたり$10 かかるので注意

## LINE

https://developers.line.biz/console/

- ここから新しいプロバイダーとチャネルを作成
- Messaging API のアクセストークンを `LINE_CHANNEL_ACCESS_TOKEN` に設定

## Google Cloud Platform

- サービスアカウントを作成
- サービスアカウントの鍵をダウンロードして、 `GOOGLE_CREDENTIALS` に設定

## Google SpreadSheet

- スプレッドシートを作成
- SpreadSheet ID を `GOOGLE_SHEET_ID` に設定
- さきほど作ったサービスアカウントに編集権限を付与
