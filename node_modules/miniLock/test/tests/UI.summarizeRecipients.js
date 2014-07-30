// Test for summarizing the recipients of an encrypted file.
QUnit.test('UI.summarizeRecipients', function(assert) {
	'use strict';
	var recipientIDs
	var myMiniLockID = '7L11mb4hrRZoBC6TUKidzpmRrytxpPaR7Q2ks6JwaCQS'

	recipientIDs = ['7L11mb4hrRZoBC6TUKidzpmRrytxpPaR7Q2ks6JwaCQS']
	assert.propEqual(
		miniLock.UI.summarizeRecipients(recipientIDs, myMiniLockID),
		{
			senderCanDecryptFile: true,
			totalRecipients: 0
		}
	)

	recipientIDs = [
		'7L11mb4hrRZoBC6TUKidzpmRrytxpPaR7Q2ks6JwaCQS',
		'6msgdRKNGxSmqrxsbUxFwawhRzcAns9PCumStmUtJFHv'
	]
	assert.propEqual(
		miniLock.UI.summarizeRecipients(recipientIDs, myMiniLockID),
		{
			senderCanDecryptFile: true,
			totalRecipients: 1
		}
	)

	recipientIDs = [
		'7L11mb4hrRZoBC6TUKidzpmRrytxpPaR7Q2ks6JwaCQS',
		'6msgdRKNGxSmqrxsbUxFwawhRzcAns9PCumStmUtJFHv',
		'CEfTr4iKoh4C71EKXB3Fji6aFEhRvyBGqqpHRBzGsVCb'
	]
	assert.propEqual(
		miniLock.UI.summarizeRecipients(recipientIDs, myMiniLockID),
		{
			senderCanDecryptFile: true,
			totalRecipients: 2
		}
	)

	recipientIDs = ['6msgdRKNGxSmqrxsbUxFwawhRzcAns9PCumStmUtJFHv']
	assert.propEqual(
		miniLock.UI.summarizeRecipients(recipientIDs, myMiniLockID),
		{
			senderCanDecryptFile: false,
			totalRecipients: 1
		}
	)

	recipientIDs = [
		'6msgdRKNGxSmqrxsbUxFwawhRzcAns9PCumStmUtJFHv',
		'CEfTr4iKoh4C71EKXB3Fji6aFEhRvyBGqqpHRBzGsVCb'
	]
	assert.propEqual(
		miniLock.UI.summarizeRecipients(recipientIDs, myMiniLockID),
		{
			senderCanDecryptFile: false,
			totalRecipients: 2
		}
	)
})
