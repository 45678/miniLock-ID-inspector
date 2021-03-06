if (location.hostname === "45678.github.io" && location.protocol !== "https:") {
  window.location = location.toString().replace("http:", "https:")
}

$(document).ready(function(){
'use strict';

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

// Classify blank input.
$(document).on('input', '#secret_phrase,#address', function(event) {
	event.currentTarget.classList.toggle('blank', (event.target.value === ''))
})

// - - - - - - - -
// Secret Phrase
// - - - - - - - -

// Classify secret phrase input as acceptable or unacceptable.
$(document).on('input', '#secret_phrase', function(event) {
  var secretPhrase = event.currentTarget
  var input = event.target.value
  var length = input.length
  var entropy = (new miniLockLib.Entropizer).evaluate(input)
  var acceptable = miniLockLib.SecretPhrase.isAcceptable(input)
  secretPhrase.classList.toggle("unacceptable", acceptable === false)
  secretPhrase.classList.toggle('acceptable_length', length >= 32)
  secretPhrase.classList.toggle('acceptable_entropy', entropy >= 200)
  secretPhrase.classList.toggle("acceptable", acceptable === true)
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
	$('#secret_phrase div.length span.numeric_value').text(length)
	renderLength.previouslyMeasuredPhraseLength = length
}

function renderEntropy(secretPhrase) {
	var previouslyMeasuredSecretPhrase = renderEntropy.previouslyMeasuredSecretPhrase || 0
	var entropy = Math.floor((new miniLockLib.Entropizer).evaluate(secretPhrase))
	var oldWidth = $('#secret_phrase div.entropy div.entropy_value').width()
	var newWidth = entropy
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
	$('#secret_phrase div.entropy span.numeric_value').text(entropy)
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
  if ($('#secret_phrase')[0].classList.contains('unacceptable')) {
    // render explaination of unacceptabledless.
  } else {
    calculateIdentity.debounced()
  }
})

function calculateIdentity() {
	var calculationStartedAt = Date.now()
	var secretPhrase = $('#secret_phrase textarea').val()
	var address = $('#address input').val()
	if (secretPhrase && address) {
		renderCalculatingIdentity()
		getKeyPair(secretPhrase, address, function(error, keys){
      if (error) {
        console.info(error)
      } else {
				var id = {}
				renderCalculatedIdentity({
					secretPhrase: secretPhrase,
					address: address,
					identity: miniLockLib.ID.encode(keys.publicKey),
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

function getKeyPair(secret, salt, callback) {
	miniLockLib.makeKeyPair(secret, salt, callback)
}

})
