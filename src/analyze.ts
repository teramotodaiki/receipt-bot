import { AzureKeyCredential, DocumentAnalysisClient, DocumentField, DocumentObjectField } from '@azure/ai-form-recognizer';

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

	const items =
		getArray(receipt.fields.Items)
			?.filter(itemIsObject)
			.filter((item) => item.properties.Description && item.properties.TotalPrice)
			.map((item) => {
				return {
					name: getString(item.properties.Description),
					price: getNumber(item.properties.TotalPrice) ?? 0,
				};
			}) ?? [];

	return {
		merchant: getString(receipt.fields.MerchantName),
		date: getDateString(receipt.fields.TransactionDate),
		total: getNumber(receipt.fields.Total),
		subTotal: getNumber(receipt.fields.Subtotal),
		items,
	};
}

function getNumber(document?: DocumentField) {
	if (document?.kind === 'number') {
		return document.value;
	}
}

function getString(document?: DocumentField) {
	if (document?.kind === 'string') {
		return document.content?.replace(/\s+/g, ' ').trim();
	}
}

function getDateString(dateDocument?: DocumentField) {
	if (dateDocument?.kind === 'date' && dateDocument.value) {
		return dateDocument.value.toLocaleDateString('ja-JP');
	}
}

function getArray(document?: DocumentField) {
	if (document?.kind === 'array') {
		return document.values;
	}
}

function itemIsObject(item: DocumentField): item is DocumentObjectField {
	return item.kind === 'object';
}
