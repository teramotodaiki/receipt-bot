export async function appendToSheet(env: Env, sheetName: string, values: unknown[][]) {
	const { GOOGLE_SPREADSHEET_ID } = env;
	const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SPREADSHEET_ID}/values/${sheetName}!A1:append?valueInputOption=USER_ENTERED`;
	const token = await getGoogleOAuthToken(env);

	const headers = new Headers({
		Authorization: `Bearer ${token}`,
		'Content-Type': 'application/json',
	});

	const body = JSON.stringify({
		values,
	});

	const response = await fetch(url, {
		method: 'POST',
		headers: headers,
		body: body,
	});

	return response;
}

async function getGoogleOAuthToken(env: Env) {
	const jwt = await createJWT(env);
	const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
	});

	const data = await tokenResponse.json();
	return data.access_token;
}

async function createJWT(env: Env) {
	const credentials = JSON.parse(env.GOOGLE_CREDENTIALS);
	const header = {
		alg: 'RS256',
		typ: 'JWT',
	};

	const iat = Math.floor(Date.now() / 1000);
	const exp = iat + 3600; // Token valid for 1 hour
	const assertion = {
		iss: credentials.client_email,
		scope: 'https://www.googleapis.com/auth/spreadsheets',
		aud: 'https://oauth2.googleapis.com/token',
		exp,
		iat,
	};

	// Encode the header and assertion
	const encodedHeader = encodeBase64URL(JSON.stringify(header));
	const encodedAssertion = encodeBase64URL(JSON.stringify(assertion));

	// Create the unsigned token
	const unsignedToken = `${encodedHeader}.${encodedAssertion}`;

	// Import the RSA private key for signing
	const cryptoKey = await crypto.subtle.importKey(
		'pkcs8',
		pemToBinary(credentials.private_key),
		{
			name: 'RSASSA-PKCS1-v1_5',
			hash: { name: 'SHA-256' },
		},
		false, // whether the key is extractable (i.e. can be used in exportKey)
		['sign']
	);

	// Sign the JWT
	const signatureArrayBuffer = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(unsignedToken));

	// Convert the ArrayBuffer to base64 URL-encoded string
	const signature = arrayBufferToBase64Url(signatureArrayBuffer);

	// Return the complete JWT
	return `${unsignedToken}.${signature}`;
}

/** PEM形式の秘密鍵からヘッダとフッタを削除し、バイナリ形式に変換する */
function pemToBinary(pem: string): ArrayBuffer {
	const base64String = pem.replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '').replace(/\s+/g, '');
	const binaryString = atob(base64String);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	return bytes.buffer;
}

function encodeBase64URL(text: string) {
	return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function arrayBufferToBase64Url(arrayBuffer: ArrayBuffer) {
	const uint8Array = new Uint8Array(arrayBuffer);
	const array = Array.from(uint8Array);
	return encodeBase64URL(String.fromCharCode.apply(null, array));
}
