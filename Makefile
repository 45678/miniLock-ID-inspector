default: miniLockLib.js underscore.min.js zepto.min.js

miniLockLib.js:
	curl https://45678.github.io/miniLockLib/miniLockLib.js >> $@

zepto.min.js:
	curl http://zeptojs.com/zepto.min.js >> $@

underscore.min.js:
	curl http://underscorejs.org/underscore-min.js >> $@

clean:
	rm -f miniLockLib.js
	rm -f underscore.min.js
	rm -f zepto.min.js
