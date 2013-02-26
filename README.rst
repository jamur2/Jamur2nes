Jamur2nes
=========


Features
--------

- Entirely web-based, no client required
- Supports audio and video; the only limit is what your browser supports
- Pause on one machine and resume on another: Perfect for long-form audio
- Supports authenticated feeds


About
-----

This project is a personal itch-scratcher for me, in that I wanted to play
around on Google App Engine, and I couldn't find a podcast client that
matched all my needs.  You can see a running instance of it at
http://jamur2nes.appspot.com, although I highly recommend if you have the
technical know-how, you set up your own instance.  This is for a couple
reasons:

- The authenticated feeds support is really sketchy, in that you have
  to send Jamur2nes your password to the feeds for it to make requests
  on your behalf.  Further, it makes no effort to encrypt the passwords
  even when at rest.  This is a hobby project after all.  I don't want
  to know your passwords, so don't tell them to me if you can avoid it
  (Most podcasts are not authenticated, so for the vast majority of
  podcasts this isn't an issue).

- More selfishly, this is a resource-intensive application on Google App
  Engine due to lots of background processing of periodic fetches.  If you
  can run a personal instance of your own on Google's free tier, it's a
  win-win for all of us.

Those disclaimers aside, this is now my primary podcast client, and it
is my preferred way to consume long-form audio and video podcast content.
Enjoy.


Known Issues
------------

- Podcasts hosted on Cachefly do not play correctly.  This is due to the fact
  that Chrome is very finnicky about Content-Length headers, and Cachefly
  doesn't set them correctly.

- Long videos (> 1 hour) may not play correctly.  I'm not sure what causes
  this, but it seems like a bug in how large files are loaded.

- Since playback relies entirely on the ``<audio>`` and ``<video>`` tags, you
  are at the whim of your browser for supported codecs.  I recommend Chrome,
  but even Chrome doesn't support AAC playback.


Setup
-----

Jamur2nes uses the `Python Google App Engine SDK
<https://developers.google.com/appengine/downloads#Google_App_Engine_SDK_for_Python>`_.

Once you have that installed (we'll pretend it's in $GAE_SDK),
you can run a local instance with::

    > $GAE_SDK/dev_appserver.py src
