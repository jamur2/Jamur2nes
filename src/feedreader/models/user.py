import google.appengine.ext.db


class User(google.appengine.ext.db.Model):
    user = google.appengine.ext.db.UserProperty(required=True)
    feeds = google.appengine.ext.db.ListProperty(
        google.appengine.ext.db.Key, required=True)


