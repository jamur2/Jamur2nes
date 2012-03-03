import google.appengine.ext.db
import feedreader.models.feed


class Entry(google.appengine.ext.db.Model):

    user = google.appengine.ext.db.UserProperty(required=True)
    feed = google.appengine.ext.db.ReferenceProperty(
        reference_class=feedreader.models.feed.Feed, required=True)
    title = google.appengine.ext.db.StringProperty(required=True)
    enclosure = google.appengine.ext.db.LinkProperty(required=True)
    entry_id = google.appengine.ext.db.StringProperty(required=True)
    play_count = google.appengine.ext.db.IntegerProperty(required=True)
    updated_time = google.appengine.ext.db.DateTimeProperty(required=True)
    timestamp = google.appengine.ext.db.IntegerProperty()
