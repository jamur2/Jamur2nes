import google.appengine.ext.db


class Feed(google.appengine.ext.db.Model):

    title = google.appengine.ext.db.StringProperty()
    url = google.appengine.ext.db.LinkProperty(required=True)
    last_fetched = google.appengine.ext.db.DateTimeProperty()
    contents = google.appengine.ext.db.BlobProperty()
    username = google.appengine.ext.db.StringProperty()
    password = google.appengine.ext.db.StringProperty()
