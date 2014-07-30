// -----------------------
// Initialization
// -----------------------

/*jshint -W079 */
var window = {}
/*jshint +W079 */
importScripts(
	'../lib/crypto/nacl.js'
)
var nacl = window.nacl
importScripts(
	'../lib/crypto/nacl-stream.js',
	'../lib/indexOfMulti.js',
	'../lib/base58.js'
)

// -----------------------
// Utility functions
// -----------------------

var base64Match = new RegExp(
	'^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$'
)

var base58Match = new RegExp(
	'^[1-9ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$'
)

// Input: String
// Output: Boolean
// Notes: Validates if string is a proper miniLock ID.
var validateID = function(id) {
	if (
		(id.length > 55) ||
		(id.length < 40)
	) {
		return false
	}
	if (!base58Match.test(id)) {
		return false
	}
	var bytes = Base58.decode(id)
	if (bytes.length !== 33) {
		return false
	}
	var hash = nacl.hash(bytes.subarray(0, 32))
	if (hash[0] !== bytes[32]) {
		return false
	}
	return true
}

// Input: Nonce (Base64) (String), Expected nonce length in bytes (Number)
// Output: Boolean
// Notes: Validates if string is a proper nonce.
var validateNonce = function(nonce, expectedLength) {
	if (
		(nonce.length > 40) ||
		(nonce.length < 10)
	) {
		return false
	}
	if (base64Match.test(nonce)) {
		var bytes = nacl.util.decodeBase64(nonce)
		return bytes.length === expectedLength
	}
	return false
}

// Input: String
// Output: Boolean
// Notes: Validates if string is a proper symmetric key.
var validateKey = function(key) {
	if (
		(key.length > 50) ||
		(key.length < 40)
	) {
		return false
	}
	if (base64Match.test(key)) {
		var bytes = nacl.util.decodeBase64(key)
		return bytes.length === 32
	}
	return false
}

var validateEphemeral = validateKey

// -----------------------
// Cryptographic functions
// -----------------------

// Receive a message to perform a certain operation.
// Input: Object:
//	{
//		operation: Type of operation ('encrypt' or 'decrypt'),
//		data: Data to encrypt/decrypt (Uint8Array),
//		name: File name (String),
//		saveName: Name to use for saving resulting file (String),
//		fileKey: 32-byte key used for file encryption (Uint8Array),
//		fileNonce: 16-byte nonce used for file encryption/decryption (Uint8Array),
//		fileInfoNonces: Array of 24-byte nonces (Uint8Array) to be used to encrypt fileInfo objects (one for each recipient),
//		fileKeyNonces: Array of 24-byte nonces (Uint8Array) to be used to encrypt fileKey to recipients (one for each recipient),
//		fileNameNonces: Array of 24-byte nonces (Uint8Array) to be used to encrypt fileName to recipients (one for each recipient),
//		ephemeral: {
//			publicKey: Ephemeral Curve25519 public key (Uint8Array),
//			secretKey: Ephemeral Curve25519 secret key (Uint8Array)
//		} (Only used for encryption)
//		miniLockIDs: Array of (Base58) miniLock IDs to encrypt to (not used for 'decrypt' operation),
//		myMiniLockID: Sender's miniLock ID (String),
//		mySecretKey: Sender's secret key (Uint8Array)
//	}
// Result: When finished, the worker will return the result
// 	which is supposed to be caught and processed by
//	the miniLock.crypto.worker.onmessage() function
//	in miniLock.js.
// Notes: A miniLock-encrypted file's first 16 bytes are always the following:
//	0x6d, 0x69, 0x6e, 0x69,
//	0x4c, 0x6f, 0x63, 0x6b,
//	0x46, 0x69, 0x6c, 0x65,
//	0x59, 0x65, 0x73, 0x2e
//	Those 16 bytes are then followed by the following JSON object (binary-encoded):
//	{
//		version: Version of the miniLock protocol used for this file (Currently 1) (Number)
//		ephemeral: Public key from ephemeral key pair used to encrypt fileInfo object (Base64),
//		fileInfo: {
//			(One copy of the below object for every recipient)
//			Unique nonce for decrypting this object (Base64): {
//				fileKey: {
//					data: Key for file decryption, encrypted using long-term key pair (Base64),
//					nonce: Nonce for above (Base64)
//				}
//				fileName: {
//					data: The file's original filename, encrypted using long-term key pair (Base64),
//					nonce: Nonce for above (Base64)
//				}
//				fileNonce: Nonce for file decryption (Base64),
//				senderID: Sender's miniLock ID (Base58)
//			}
//			(Encrypted with recipient's public key using ephemeral key pair and stored as Base64 string)
//		}
//	}
// Note that the file name is padded with 0x00 bytes until it reaches 256 bytes in length.
//	The JSON object's end is then signaled by the following 16-byte delimiter:
//		0x6d, 0x69, 0x6e, 0x69,
//		0x4c, 0x6f, 0x63, 0x6b,
//		0x45, 0x6e, 0x64, 0x49,
//		0x6e, 0x66, 0x6f, 0x2e
//	...after which we have the ciphertext in binary format.
//	Note that we cannot ensure the integrity of senderID unless it can be used to carry out a
//	successful, authenticated decryption of both fileInfo and consequently the ciphertext.
onmessage = function(message) {
message = message.data

// We have received a request to encrypt
if (message.operation === 'encrypt') {
	(function() {
		var header = {
			version: 1,
			ephemeral: nacl.util.encodeBase64(message.ephemeral.publicKey),
			fileInfo: {}
		}
		var paddedFileName = message.name
		while (paddedFileName < 256) {
			paddedFileName += String.fromCharCode(0x00)
		}
		for (var i = 0; i < message.miniLockIDs.length; i++) {
			var encryptedFileKey = nacl.box(
				message.fileKey,
				message.fileKeyNonces[i],
				Base58.decode(message.miniLockIDs[i]).subarray(0, 32),
				message.mySecretKey
			)
			var encryptedFileName = nacl.box(
				nacl.util.decodeUTF8(paddedFileName),
				message.fileNameNonces[i],
				Base58.decode(message.miniLockIDs[i]).subarray(0, 32),
				message.mySecretKey
			)
			var fileInfo = {
				senderID: message.myMiniLockID,
				fileKey: {
					data: nacl.util.encodeBase64(encryptedFileKey),
					nonce: nacl.util.encodeBase64(message.fileKeyNonces[i])
				},
				fileName: {
					data: nacl.util.encodeBase64(encryptedFileName),
					nonce: nacl.util.encodeBase64(message.fileNameNonces[i])
				},
				fileNonce: nacl.util.encodeBase64(message.fileNonce)
			}
			fileInfo = JSON.stringify(fileInfo)
			var encryptedFileInfo = nacl.box(
				nacl.util.decodeUTF8(fileInfo),
				message.fileInfoNonces[i],
				Base58.decode(message.miniLockIDs[i]).subarray(0, 32),
				message.ephemeral.secretKey
			)
			header.fileInfo[
				nacl.util.encodeBase64(message.fileInfoNonces[i])
			] = nacl.util.encodeBase64(encryptedFileInfo)
		}
		var streamEncryptor = nacl.stream.createEncryptor(
			message.fileKey,
			message.fileNonce
		)
		var encrypted = [
			'miniLockFileYes.',
			JSON.stringify(header),
			'miniLockEndInfo.',
		]
		for (var c = 0; c < message.data.length; c += 65535) {
			var isLast = false
			if (c >= (message.data.length - 65535)) {
				isLast = true
			}
			var encryptedChunk = streamEncryptor.encryptChunk(
				message.data.subarray(c, c + 65535),
				isLast
			)
			if (!encryptedChunk) {
				postMessage({
					operation: 'encrypt',
					error: 1
				})
				throw new Error('miniLock: Encryption failed - general encryption error')
				return false
			}
			encrypted.push(encryptedChunk)
		}
		streamEncryptor.clean()
		postMessage({
			operation: 'encrypt',
			data: encrypted,
			name: message.name,
			saveName: message.saveName,
			senderID: message.myMiniLockID,
			callback: message.callback
		})
	})()
}


// We have received a request to decrypt
if (message.operation === 'decrypt') {
	(function() {
		var miniLockInfoEnd = [
			0x6d, 0x69, 0x6e, 0x69,
			0x4c, 0x6f, 0x63, 0x6b,
			0x45, 0x6e, 0x64, 0x49,
			0x6e, 0x66, 0x6f, 0x2e
		]
		var miniLockInfoEndIndex, header
		try {
			miniLockInfoEndIndex = message.data.indexOfMulti(miniLockInfoEnd)
			header = nacl.util.encodeUTF8(message.data.subarray(16, miniLockInfoEndIndex))
			header = JSON.parse(header)
			message.data = message.data.subarray(
				miniLockInfoEndIndex + miniLockInfoEnd.length,
				message.data.length
			)
		}
		catch(error) {
			postMessage({
				operation: 'decrypt',
				error: 3
			})
			throw new Error('miniLock: Decryption failed - could not parse header')
			return false
		}
		if (
			!header.hasOwnProperty('version')
			|| header.version !== 1
		) {
			postMessage({
				operation: 'decrypt',
				error: 4
			})
			throw new Error('miniLock: Decryption failed - invalid header version')
			return false
		}
		if (
			!header.hasOwnProperty('ephemeral')
			|| !validateEphemeral(header.ephemeral)
		) {
			postMessage({
				operation: 'decrypt',
				error: 5
			})
			throw new Error('miniLock: Decryption failed - could not validate sender ID')
			return false
		}
		// Attempt fileInfo decryptions until one succeeds
		var actualFileInfo  = null
		var actualFileKey   = null
		var actualFileName  = null
		var actualFileNonce = null
		for (var i in header.fileInfo) {
			if (
				({}).hasOwnProperty.call(header.fileInfo, i)
				&& validateNonce(i, 24)
			) {
				try {
					nacl.util.decodeBase64(header.fileInfo[i])
				}
				catch(err) {
					postMessage({
						operation: 'decrypt',
						error: 3
					})
					throw new Error('miniLock: Decryption failed - could not parse header')
					return false
				}
				actualFileInfo = nacl.box.open(
					nacl.util.decodeBase64(header.fileInfo[i]),
					nacl.util.decodeBase64(i),
					nacl.util.decodeBase64(header.ephemeral),
					message.mySecretKey
				)
				if (actualFileInfo) {
					try {
						actualFileInfo = JSON.parse(
							nacl.util.encodeUTF8(actualFileInfo)
						)
					}
					catch(err) {
						postMessage({
							operation: 'decrypt',
							error: 3
						})
						throw new Error('miniLock: Decryption failed - could not parse header')
						return false
					}
					break
				}
			}
		}
		if (!actualFileInfo) {
			postMessage({
				operation: 'decrypt',
				error: 6
			})
			throw new Error('miniLock: Decryption failed - File is not encrypted for this recipient')
			return false
		}
		if (
			!({}).hasOwnProperty.call(actualFileInfo, 'fileKey')
			|| !({}).hasOwnProperty.call(actualFileInfo.fileKey, 'data')
			|| !actualFileInfo.fileKey.data.length
			|| !({}).hasOwnProperty.call(actualFileInfo.fileKey, 'nonce')
			|| !validateNonce(actualFileInfo.fileKey.nonce, 24)
			|| !({}).hasOwnProperty.call(actualFileInfo, 'fileName')
			|| !({}).hasOwnProperty.call(actualFileInfo.fileName, 'data')
			|| !actualFileInfo.fileName.data.length
			|| !({}).hasOwnProperty.call(actualFileInfo.fileName, 'nonce')
			|| !validateNonce(actualFileInfo.fileName.nonce, 24)
			|| !({}).hasOwnProperty.call(actualFileInfo, 'fileNonce')
			|| !validateNonce(actualFileInfo.fileNonce, 16)
			|| !({}).hasOwnProperty.call(actualFileInfo, 'senderID')
			|| !validateID(actualFileInfo.senderID)
		) {
			postMessage({
				operation: 'decrypt',
				error: 3
			})
			throw new Error('miniLock: Decryption failed - could not parse header')
			return false
		}
		try {
			actualFileKey = nacl.box.open(
				nacl.util.decodeBase64(actualFileInfo.fileKey.data),
				nacl.util.decodeBase64(actualFileInfo.fileKey.nonce),
				Base58.decode(actualFileInfo.senderID).subarray(0, 32),
				message.mySecretKey
			)
			actualFileName = nacl.box.open(
				nacl.util.decodeBase64(actualFileInfo.fileName.data),
				nacl.util.decodeBase64(actualFileInfo.fileName.nonce),
				Base58.decode(actualFileInfo.senderID).subarray(0, 32),
				message.mySecretKey
			)
			actualFileName  = nacl.util.encodeUTF8(actualFileName)
			actualFileNonce = nacl.util.decodeBase64(actualFileInfo.fileNonce)
		}
		catch(err) {
			postMessage({
				operation: 'decrypt',
				error: 3
			})
			throw new Error('miniLock: Decryption failed - could not parse header')
			return false
		}
		if (!actualFileKey || !actualFileName) {
			postMessage({
				operation: 'decrypt',
				error: 3
			})
			throw new Error('miniLock: Decryption failed - could not parse header')
			return false
		}
		while (
			actualFileName[
				actualFileName.length - 1
			] === String.fromCharCode(0x00)
		) {
			actualFileName = actualFileName.slice(0, -1)
		}
		var streamDecryptor = nacl.stream.createDecryptor(
			actualFileKey,
			actualFileNonce
		)
		var decrypted = []
		for (var c = 0; c < message.data.length; c += (2 + 16 + 65535)) {
			var isLast = false
			if (c >= (message.data.length - (2 + 16 + 65535))) {
				isLast = true
			}
			var decryptedChunk = streamDecryptor.decryptChunk(
				message.data.subarray(c, c + (2 + 16 + 65535)),
				isLast
			)
			if (!decryptedChunk) {
				postMessage({
					operation: 'decrypt',
					error: 2
				})
				throw new Error('miniLock: Decryption failed - general decryption error')
				return false
			}
			decrypted.push(decryptedChunk)
		}
		postMessage({
			operation: 'decrypt',
			data: decrypted,
			name: actualFileName,
			saveName: actualFileName,
			senderID: actualFileInfo.senderID,
			callback: message.callback
		})
	})()
}

}
