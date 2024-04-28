import { AzureKeyCredential, DocumentAnalysisClient, DocumentField } from '@azure/ai-form-recognizer';

export async function analyze(arrayBuffer: ArrayBuffer, env: Env) {
	// Azure resource name and key
	const endpoint = 'https://personal-jikken-receipt-analyzer.cognitiveservices.azure.com';

	// Create a new client
	const credential = new AzureKeyCredential(env.AZURE_SUBCRIPTION_KEY);
	const client = new DocumentAnalysisClient(endpoint, credential);

	// Model ID for analyzing receipts is "prebuilt-receipt"
	const poller = await client.beginAnalyzeDocument('prebuilt-receipt', arrayBuffer);
	const { documents } = await poller.pollUntilDone();

	if (!documents || documents.length <= 0) {
		throw new Error('No documents were found.');
	}

	// Get the first document from the receipt
	const receipt = documents[0];

	const merchant = getString(receipt.fields.MerchantName);

	const items = receipt.fields.Items;
	if (items.kind === 'array') {
		for (const item of items.values) {
			if (item.kind === 'object') {
				let product = getString(item.properties.Description);
				// クスリのアオキのレシートには * で始まるものがあり、これがカタカナの「ネ」に誤読される
				if (merchant === 'クスリのアオキ' && product?.[0] === 'ネ') {
					product = product.slice(1);
				}
				const price = getNumber(item.properties.TotalPrice);
				// const code = getString(item.properties.ProductCode);
				console.log(`${merchant},${product},${price}`);
			}
		}
	}
	const total = getNumber(receipt.fields.Total);
	console.log('SubTotal: ', total);

	// Extract and print receipt information
	console.log('Receipt Type: ', receipt.docType);
	for (let [key, field] of Object.entries(receipt.fields)) {
		console.log(key, ': ', field?.content || field.values || 'N/A');
	}

	console.log('Merchant Name: ', receipt.fields.MerchantName.content || 'N/A');
	console.log('Transaction Date: ', receipt.fields.transactionDate?.value || 'N/A');
	console.log('Total: ', receipt.fields.total?.value || 'N/A');

	return receipt;
}

function getNumber(document?: DocumentField) {
	if (document?.kind === 'number') {
		return document.value;
	}
}

function getString(document?: DocumentField) {
	if (document?.kind === 'string') {
		return document.content;
	}
}

function getArray(document?: DocumentField) {
	if (document?.kind === 'array') {
		return document.values;
	}
}

function getObject(document?: DocumentField) {
	if (document?.kind === 'object') {
		return document.properties;
	}
}
