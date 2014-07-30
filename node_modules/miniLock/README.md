#![miniLock](https://raw.githubusercontent.com/kaepora/miniLock/master/src/img/icon48.png) miniLock  [![Build Status](https://travis-ci.org/kaepora/miniLock.svg?branch=master)](https://travis-ci.org/kaepora/miniLock)
##File encryption software that does more with less.

* **[Code](https://github.com/kaepora/miniLock)** | **[Issues and Discussion](https://github.com/kaepora/miniLock/issues)**
* **HOPE X [Video](https://vimeo.com/101237413) | [Slides](http://minilock.io/files/HOPEX.pdf)**
* **Follow on [Twitter](https://twitter.com/minilockapp)** for latest project news

###Software Status: Pre-Release Feedback Period
miniLock is currently audited, peer-reviewed software. However, before a general release, we would like to allow a feedback period. We encourage further review of the software before a release is made for general public use. We hope to provide a public release by **Monday August 4th, 2014**. Our first release platform will be Google Chrome and Chrome OS.

miniLock was subjected to a cryptographic code audit carried out by [Cure53](https://cure53.de/) and with the support of the [Open Technology Fund](https://www.opentechfund.org/). Quoting from the conclusion of the audit report (**[PDF](http://minilock.io/files/cure53.pdf)**):

> Cure53 was tasked to test against the application security of miniLock and evaluate its cryptographic properties and promises. Over the course of four days of manual testing, no severe errors have been spotted. The code is soundly and neatly written, well structured, minimal and therefore offers no sinks for direct exploitation.

miniLock also ships with a Unit Test Kit located in `test`.

###0. Overview
miniLock is a small, portable file encryption software. The idea behind its design is that passphrase memorized by the user, along with their email address, can act as a complete, portable basis for a persistent public key identity and provide a full substitute for other key pair models, such as having the key pair stored on disk media (the PGP approach).  

Advancements in elliptic curve cryptography, specifically in systems such as `curve25519`, allow us to generate key pairs where the lengths of both public and private keys are relatively very small. This means that public keys become far easier to share (miniLock public keys, called *miniLock IDs*, fit inside less than half a tweet). This also means that a human-memorizable passphrase of adequate entropy can be used as the basis for deriving a private key.

When first opened, miniLock asks the user for their email address and a passphrase which it then uses to derive the user's private and public keys. Via this model, the user can establish their key pair on any computer that has miniLock installed using only this passphrase, without having to manage key files or identities and so on. Thanks to the small key sizes present in `curve25519`, we are guaranteed small, easily tweetable public keys and private keys that can be derived from passphrases. miniLock also contains checks to ensure the passphrases entered by the user are of sufficient entropy. miniLock will refuse weak passphrases completely and instead suggest stronger passphrases for use by the user.

miniLock then allows the user to encrypt files to other miniLock users via their miniLock IDs and decrypt files sent to them. miniLock's encryption format supports encrypting a single file to multiple recipients with a negligible increase in file size. Another feature is that analyzing a miniLock-encrypted file does not yield the miniLock IDs or identities of the sender or the recipient(s). Upon decryption, a legitimate recipient will be able to know and verify the identity of the sender, but will still be unable to determine the identity of other potential recipients.

miniLock file encryption provides both confidentiality and integrity. miniLock uses the [TweetNaCL](http://tweetnacl.cr.yp.to) cryptography library, [ported to JavaScript](https://github.com/dchest/tweetnacl-js), entirely due to its focus on simplicity, auditability and small size. Similarly, miniLock is designed to be as simple, portable, auditable and usable as possible. miniLock also uses [scrypt](http://www.tarsnap.com/scrypt.html) for "memory-hard" key derivation.

###1. User Flow
This section outlines an example user flow in order to help demonstrate how miniLock is supposed to help people.

Alice wants to send a scan of her passport to Bob. Sending it over email would compromise personal information, so Alice decided to first encrypt the scan using miniLock.

Bob opens miniLock and enters his email address and passphrase. miniLock displays his miniLock ID, which is tied to his passphrase and is persistent. He sends Alice his miniLock ID, which looks something like this:
`Uvs4PoMMK9Rkoyy5qbcnJDq6jc8MNAeVREekc6SBsXLSH`

Alice drags and drops her passport scan into miniLock and enters Bob's miniLock ID as the recipient. She clicks the encrypt button and sends the resulting `.minilock` file to Bob. Once Bob drags the encrypted file into miniLock, it automatically detects it as a miniLock-encrypted file destined to Bob, and decrypts and saves the passport scan on his computer.

###2. Key Derivation
miniLock uses the [zxcvbn](https://github.com/dropbox/zxcvbn) library in order to impose a strict limit on the amount of detected entropy present in entered passphrases. miniLock will not allow passphrases that fall below the threshold of 100 bits of entropy: if a passphrase of lower entropy is detected, miniLock will refuse it and will not allow access to encryption or decryption functions.

Users are encouraged to use passphrases which are easier to remember but harder to guess. If a user fails to enter a sufficiently entropic passphrase, miniLock will use a built-in dictionary of the 58,110 most common words in the English language to suggest a seven-word passphrase. This gives us a passphrase with approximately 111 bits of entropy, since 58110<sup>7</sup> ~= 2<sup>111</sup>.

Once we obtain a suitable passphrase, we hash it using `SHA-512` and then derive the user's 32-byte private key by applying `scrypt` onto the obtained hash using the following parameters:

* N = 2<sup>17</sup>
* r = 8,
* p = 1,
* L = 32

miniLock uses the email address entered by the user as the `scrypt` key derivation salt. Email addresses are unique by nature and therefore provide a good basis for a salt.

Once we obtain our 32-byte private key, the public key is derived for use with the TweetNaCL `curve25519-xsalsa20-poly1305` construction.

The user's `miniLock ID` consists of 33 bytes. The first 32 bytes are the user's `curve25519` public key. The last byte acts as a checksum: it is derived by hashing the first 32 bytes with `SHA-512` and truncating the resulting hash to its first byte. After constructing the 33 bytes of the miniLock ID, it is encoded into a Base58 representation, meant to be easily communicable via email or instant messaging.


###3. File format
miniLock saves encrypted files as binary blobs with the following format:

```javascript
Bytes signaling beginning of header
Header bytes
Bytes signaling ending of header
Ciphertext bytes
```

The beginning of the header is signaled with the following 16 bytes:

```javascript
0x6d, 0x69, 0x6e, 0x69,
0x4c, 0x6f, 0x63, 0x6b,
0x46, 0x69, 0x6c, 0x65,
0x59, 0x65, 0x73, 0x2e
```

The end of the header is signaled with the following 16 bytes:

```javascript
0x6d, 0x69, 0x6e, 0x69,
0x4c, 0x6f, 0x63, 0x6b,
0x45, 0x6e, 0x64, 0x49,
0x6e, 0x66, 0x6f, 0x2e
```

The header itself is a stringified JSON object which contains information necessary for the recipients to decrypt the file. The JSON object has the following format:

```json
{
version: Version of the miniLock protocol used for this file (Currently 1) (Number)
ephemeral: Public key from ephemeral key pair used to encrypt fileInfo object (Base64),
fileInfo: {
	(One copy of the below object for every recipient)
	Unique nonce for decrypting this object (Base64): {
		fileKey: {
			data: Key for file decryption, encrypted using long-term secret key to recipient's long-term public key (Base64),
			nonce: Unique nonce for the above (Base64)
		}
		fileName: {
			data: Original filname, encrypted using long-term secret key to recipient's long-term public key (Base64),
			nonce: Unique nonce for the above (Base64)
		}
		fileNonce: Nonce for file decryption (Base64),
		senderID: Sender's miniLock ID (Base58)
	}
	(Encrypted with shared secret derived from the sender’s
	 private ephemeral key and recipient's long-term public key.
	 Stored as Base64 string.)
}
}
```

Note that in the above header, `fileName` is padded with the `0x00` byte until it reaches 256 bytes in length. This is done in order to prevent the discovery of the `fileName` length purely by analyzing an encrypted miniLock file's header.

###4. File encryption
The sender begins by generating a new ephemeral `curve25519` key pair, `senderEphemeralSecret` and `senderEphemeralPublic`.

The sender's long-term keys are denoted as `senderSecret` and `senderPublic`.

A recipient `a`'s long-term keys are denoted as `recipientSecret[a]` and `recipientPublic[a]`.

The sender appends the bytes signalling the beginning of the header to the final encrypted file.

A random 32-byte `fileKey` and a random 16-byte `fileNonce` are generated and used to symmetrically encrypt the plaintext bytes using TweetNaCL's `xsalsa20-poly1305` construction. We encrypt the plaintext bytes by splitting the plaintext into 65535-byte chunks. Each chunk is then encrypted using the following model:

```javascript
fullNonce0 = fileNonce || 0
encryptedChunk0 = length(chunk0) || nacl.secretbox(chunk0, fullNonce0, fileKey)
fullNonce1 = fileNonce || 1
encryptedChunk1 = length(chunk1) || nacl.secretbox(chunk1, fullNonce1, fileKey)
...
```

In the above example, the 24-byte `fullNonce` is acquired by concatenating the 16-byte `fileNonce` and 8-byte little-endian chunk number. Also,`length(chunk)` is a 2-byte little-endian plaintext chunk length.

The last chunk is encrypted as follows:
```javascript
fullNonceN = fileNonce || setMostSignificantBit(N)
encryptedChunkN = length(chunkN) || nacl.secretbox(chunkN, fullNonceN, fileKey)
```

For every recipient `n`, the sender encrypts `fileKey` and `fileName` (the file's intended name upon decryption) using `senderSecret` and `recipientPublic[n]` and stores them within a `fileInfo` object inside the JSON header along with `fileNonce` and `senderID`, as described in §3.

The name of the `fileInfo` property in which the aforementioned elements are stored is a 24-byte nonce. The sender uses this nonce, along with `senderEphemeralSecret`, to encrypt the underlying JSON object asymmetrically to `senderPublic`, using TweetNaCL's `curve25519-xsalsa20-poly1305` construction. Note that this is done once for every recipient, creating a different `fileInfo` object for every recipient, each labeled by their unique nonces.

Finally, the sender appends the bytes signalling the end of the header, followed by the ciphertext bytes.

TweetNaCL's `curve25519-xsalsa20-poly1305` construction provides authenticated encryption, guaranteeing both confidentiality and ciphertext integrity. The above header construction makes it impossible to determine the sender or recipient(s) of a miniLock-encrypted file simply by analyzing the ciphertext.

###5. File decryption
In order to decrypt the file, the recipient needs the information stored within the `fileInfo` section of the header. They also will need the `ephemeral` property of the header in order to derive the shared secret, in conjunction with their long-term secret key, which can be used to decrypt their copy of the `fileInfo` header object.

If there are multiple properties within `fileInfo`, the recipient must iterate through every property until she obtains an authenticated decryption of the underlying object. Once a successful authenticated decryption of a `fileInfo` property occurs, the recipient can then use the obtained `senderID` along with their long-term secret key to decrypt `fileKey` and use it in conjunction with `fileNonce` to perform an authenticated decryption of the ciphertext bytes.

In order to decrypt the ciphertext bytes, the recipient breaks the ciphertext down to chunks of 65553 bytes: the original 65535 bytes of the plaintext chunk, plus the 2 bytes defining the chunk length and the 16 bytes defining the `poly1305` authentication code of that particular ciphertext chunk. Each chunk is then decrypted sequentially using the following model:

```javascript
fullNonce0 = fileNonce || 0
decryptedChunk0 = nacl.secretbox.open(chunk0, fullNonce0, fileKey)
fullNonce1 = fileNonce || 1
decryptedChunk1 = nacl.secretbox.open(chunk1, fullNonce1, fileKey)
...
```

The recipient then decrypts `fileName` (again using `senderID`), and removes the padding of `0x00` bytes from the decrypted `fileName` in order to obtain the intended file name. The recipient is now capable of saving the decrypted file.

If the authenticated asymmetric decryption of any header object fails, or the authenticated symmetric decryption of the file ciphertext fails, we return an error to the user and halt decryption. No partial data is returned.

###6. Key Identity Authentication
In PGP, public keys can be substantially larger than miniLock IDs, therefore necessitating the generation of key fingerprints which can then be used for out-of-band key identity authentication. With miniLock, users are able to authenticate out-of-band directly using the miniLock ID, due to its small length (approximately 45 Base58-encoded characters). Therefore, no specialized key identity authentication mechanism is required.

###7. Error Codes
miniLock will output these error codes when running into encryption or decryption errors. The user interface can then handle these errors in order to display information that is relevant to users:

**Encryption errors**
* `Error 1`: General encryption error

**Decryption errors**
* `Error 2`: General decryption error
* `Error 3`: Could not parse header
* `Error 4`: Invalid header version
* `Error 5`: Could not validate sender ID
* `Error 6`: File is not encrypted for this recipient

###8. Caveats
miniLock is not intended to protect against malicious files being sent and received. It is the user's responsibility to vet the safety of the files they send or receive over miniLock. miniLock cannot protect against malware being sent over it.

###9. Thanks
Sincere thanks are presented to Dr. Matthew D. Green and Meredith L. Patterson, who gave feedback on an early draft of this document.

Sincere thanks are presented to Trevor Perrin for his invaluable contribution to miniLock's design, which introduced sender ID anonymity in the ciphertext.

Sincere thanks are presented to Dmitry Chestnykh for his work on porting TweetNaCL to JavaScript and his general cooperation with the miniLock project, including many helpful and crucial suggestions.

Sincere thanks are presented to Dr. Mario Heiderich and his team at [Cure53](https://cure53.de/) for their work on performing a full audit of the miniLock codebase. We also sincerely thank the [Open Technology Fund](https://www.opentechfund.org/) for funding the audit.

Finally, sincere thanks are presented to the wonderful, constructive members of the miniLock community who have contributed many improvements and ideas to the miniLock design and codebase. You rock!

###10. Credits
**miniLock**
* Copyright 2014 [Nadim Kobeissi](http://nadim.computer). Released under the AGPLv3 license.

**TweetNaCL**
* [Daniel J. Bernstein](http://cr.yp.to/djb.html)
* Wesley Janssen
* [Tanja Lange](http://hyperelliptic.org/tanja)
* [Peter Schwabe](http://www.cryptojedi.org/users/peter/)
* [Matthew Dempsky](https://github.com/mdempsky)

**TweetNaCL-JS**
* [Dmitry Chestnykh](http://github.com/dchest)
* [Devi Mandiri](https://github.com/devi)

**scrypt**
* [Colin Percival](http://www.tarsnap.com/scrypt.html)
