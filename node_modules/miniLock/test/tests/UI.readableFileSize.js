// Tests for human readable file sizes.
QUnit.test('UI.readableFileSize', function(assert) {
	'use strict';
	assert.equal(miniLock.UI.readableFileSize(0),            '0KB')
	assert.equal(miniLock.UI.readableFileSize(48),           '1KB')
	assert.equal(miniLock.UI.readableFileSize(456),          '1KB')
	assert.equal(miniLock.UI.readableFileSize(1024),         '1KB')
	assert.equal(miniLock.UI.readableFileSize(1512),         '2KB')
	assert.equal(miniLock.UI.readableFileSize(67800),       '67KB')
	assert.equal(miniLock.UI.readableFileSize(912000),     '891KB')
	assert.equal(miniLock.UI.readableFileSize(1234567),    '1.2MB')
	assert.equal(miniLock.UI.readableFileSize(2000000000), '1.9GB')
})