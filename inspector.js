$(document).ready(function(){
'use strict';

miniLockLib.pathToScripts = 'node_modules/miniLockLib'

// - - - - - - - -
// Basics
// - - - - - - - -

// Maintain focused classification for secret phrase and address inputs.
$(document).on('focusin', '#secret_phrase,#address', function(event) {
	$(event.currentTarget).addClass('focused')
})
$(document).on('focusout', '#secret_phrase,#address', function(event) {
	$(event.currentTarget).removeClass('focused')
})

// - - - - - - - -
// Secret Phrase
// - - - - - - - -

// Update secret phrase classification when input changes.
$(document).on('input', '#secret_phrase', function(event) {
	$(event.currentTarget).toggleClass('blank', $(event.target).val() === '')
})

// Classify acceptable secret phrase when it meets minimum standards. 
$(document).on('input', '#secret_phrase', function(event) {
	$('#secret_phrase').toggleClass('acceptable', 
		miniLockLib.secretPhraseIsAcceptable($('#secret_phrase textarea').val())
	)
})

$(document).on('input', '#secret_phrase', function(event) {
	$('#secret_phrase').toggleClass('acceptable_length', 
		$('#secret_phrase textarea').val().length >= 32
	)
})

$(document).on('input', '#secret_phrase', function(event) {
	$('#secret_phrase').toggleClass('acceptable_entropy', 
		Math.floor(zxcvbn($('#secret_phrase textarea').val()).entropy) >= 100
	)
})

var anim = {stopped: true, stepDuration: 20, firstStepDelay: 100}

anim.placeholder = "Type a secret phrase to measure it"

anim.start = function() {
	if (anim.stopped) {
		$('#secret_phrase textarea').attr('placeholder', '')
		anim.index = 0
		$('#secret_phrase').addClass('showingPlaceholder')
		anim.stopped = false
		setTimeout(anim.step, anim.firstStepDelay)
		renderLength('')
		renderEntropy('')
	}
}
anim.step = function() {
	if (anim.stopped) return
	anim.index = anim.index + 1
	var phrase = anim.placeholder.substr(0, anim.index)
	$('#secret_phrase textarea').attr('placeholder', phrase)
	renderLength(phrase)
	renderEntropy(phrase)
	if (anim.index < anim.placeholder.length) {
		setTimeout(anim.step, anim.stepDuration)
	} else {
		setTimeout(anim.stop, 5000)
	}
}
anim.stop = function() {
	if (anim.stopped === false) {
		$('#secret_phrase').removeClass('showingPlaceholder')
		renderLength('')
		renderEntropy('')
		anim.stopped = true
	}
}

// When the secret phrase input is focused, start the 
// placeholder animation if the input is blank.
$(document).on('focusin', '#secret_phrase', function(event) {
	var secretPhrase = $('#secret_phrase textarea').val()
	if (secretPhrase === '') {
		anim.start()
	}
})

// Stop the placeholder animation when the secret phrase
// input loses focus.
$(document).on('focusout', '#secret_phrase', function(event) {
	anim.stop()
})

// Render entropy graphic when the secret phrase changes.
$(document).on('input', '#secret_phrase', function(event) {
	var secretPhrase = $('#secret_phrase textarea').val()
	if (secretPhrase !== '') anim.stop()
	renderLength(event.target.value)
	renderEntropy(event.target.value)
})

function renderLength(secretPhrase) {
	var previouslyMeasuredPhraseLength = renderLength.previouslyMeasuredPhraseLength || 0
	var length = secretPhrase.length
	var oldWidth = $('#secret_phrase div.length div.length_value').width()
	var newWidth = length * 6.25
	var distance = Math.abs(oldWidth - newWidth)
	var duration = distance * 1.4
	var delay = 0
	if (secretPhrase.length === 0 && previouslyMeasuredPhraseLength.length > 1) {
		delay = 250
		duration = duration * 2
	}
	$('#secret_phrase div.length div.length_value').css({
		width: newWidth + 'px',
		transition: 'width '+duration+'ms ease-out '+delay+'ms'
	})
	$('#secret_phrase div.length label.numeric_value').text(length)
	renderLength.previouslyMeasuredPhraseLength = length
}

function renderEntropy(secretPhrase) {
	var previouslyMeasuredSecretPhrase = renderEntropy.previouslyMeasuredSecretPhrase || 0
	var entropy = Math.floor(zxcvbn(secretPhrase).entropy)
	var oldWidth = $('#secret_phrase div.entropy div.entropy_value').width()
	var newWidth = entropy * 2
	var distance = Math.abs(oldWidth - newWidth)
	var duration = distance * 1.4
	var delay = 0
	if (secretPhrase.length === 0 && previouslyMeasuredSecretPhrase.length > 1) {
		delay = 250
		duration = duration * 2
	}
	$('#secret_phrase div.entropy div.entropy_value').css({
		width: newWidth + 'px',
		transition: 'width '+duration+'ms ease-out '+delay+'ms'
	})
	$('#secret_phrase div.entropy label.numeric_value').text(entropy)
	renderEntropy.previouslyMeasuredSecretPhrase = secretPhrase
}

// - - - - - - - -
// miniLock Identity
// - - - - - - - -

$(document).on('input', '#secret_phrase,#address', function(){
	var secretPhrase = $('#secret_phrase textarea').val()
	if (secretPhrase === '') {
		renderBlankIdentity()
	} else {
		renderExpiredIdentity()
	}
	calculateIdentity.debounced()
})

function calculateIdentity() {
	var calculationStartedAt = Date.now()
	var secretPhrase = $('#secret_phrase textarea').val()
	var address = $('#address input').val()
	if (secretPhrase && address) {
		renderCalculatingIdentity()
		getKeyPair(secretPhrase, address, function(keys){
			if (secretPhrase === $('#secret_phrase textarea').val()) {
				var id = {}
				renderCalculatedIdentity({
					secretPhrase: secretPhrase,
					address: address,
					identity: miniLockLib.makeID(keys.publicKey),
					keys: keys,
					calculationDuration: Date.now() - calculationStartedAt
				})
			}
		})
	}
}

calculateIdentity.debounced = _.debounce(calculateIdentity, 1000)

function renderBlankIdentity() {
	$('#identity').removeClass('calculating done expired')
	$('#identity').addClass('blank')
	
	$('#miniLockID code').one('transitionend', function(){
		$('#miniLockID code').html('&nbsp;')
	})
	
	$('#keys img').one('transitionend', function(event){
		$(event.target).css({'transition': ''})
	}).css({
		'height': '255px',
		'transition': 'height 1000ms ease-out'
	})
}

function renderCalculatingIdentity() {
	$('#identity').removeClass('calculating done expired')
	$('#identity').addClass('calculating')
}

function renderCalculatedIdentity(id) {
	$('#identity').removeClass('blank calculating done expired')
	$('#identity').addClass('done')

	var publicKeyArray = []
	var secretKeyArray = []
	for (var i = 0; i < 32; i++) {
		publicKeyArray.push(id.keys.publicKey[i])
		secretKeyArray.push(id.keys.secretKey[i])
	}
	$('#calculation_duration').text((id.calculationDuration/1000).toFixed(1))
	$('#miniLockID code').text(id.identity)	
	$('#public_key_graphic img').each(function(index, tag){
		$(tag).css({
			'height': publicKeyArray[index] + 'px',
			'transition': 'height 300ms ease-out '+((index*15)+0)+'ms, background-color 0ms linear '+((index*15)+0)+'ms'
		})
	})
	$('#private_key_graphic img').each(function(index, tag){
		$(tag).css({
			'height': secretKeyArray[index] + 'px',
			'transition': 'height 300ms ease-out '+((index*15)+510)+'ms, background-color 0ms linear '+((index*15)+510)+'ms'
		})
	})
	setTimeout(function(){
		$('#keys img').css({'transition': ''})
	}, 1500)
}

function renderExpiredIdentity() {
	$('#identity').removeClass('calculating done expired')
	$('#identity').addClass('expired')
}

function getKeyPair(key, salt, callback) {
	miniLockLib.getKeyPair(key, salt, callback)
}

})