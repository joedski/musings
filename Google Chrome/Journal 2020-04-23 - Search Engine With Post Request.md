Journal 2020-04-23 - Search Engine With Post Request
========

> Summary 2020-04-23: Nope.  Das ist nicht possible.

Sometimes the search you want to do is a post request rather than a get request, which makes sense but is also annoying.  Chrome only lets you specify a string to navigate to, but this requires an actual tab with HTML and JS in it, which is not what the default new tab is.

1. Suggesting making the URL a JS string to create a form and submit it: https://superuser.com/questions/287658/google-chrome-search-engine-with-search-term-in-post-variable
2. Ancient (2009) Chromium bug about this feature: https://bugs.chromium.org/p/chromium/issues/detail?id=18107
    1. From this SO answer.  Apparently it's something Firefox already does: https://stackoverflow.com/questions/44548486/force-google-chrome-to-use-post-from-opensearch-xml
