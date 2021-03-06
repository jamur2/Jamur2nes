import StringIO
import base64
import datetime
import feedparser
import feedreader.models.entry
import feedreader.models.feed
import feedreader.models.user
import feedreader.utils
import feedreader.utils.debug
import google.appengine.api.files
import google.appengine.api.files.blobstore
import google.appengine.api.taskqueue
import google.appengine.api.urlfetch
import google.appengine.ext.blobstore
import google.appengine.ext.webapp
import google.appengine.ext.webapp.util

class EntryScheduler(google.appengine.ext.webapp.RequestHandler):

    def get(self):
        self.post()

    def post(self):
        for user in feedreader.models.user.User.all():
            for feed_key in user.feeds:
                google.appengine.api.taskqueue.add(
                    url='/async/get_entries',
                    params={
                        'user': str(user.key()),
                        'feed': feed_key,
                    })


class EntryWorker(google.appengine.ext.webapp.RequestHandler):

    def get(self):
        self.post()

    def post(self):
        user_key = google.appengine.ext.db.Key(self.request.get('user'))
        feed_key = google.appengine.ext.db.Key(self.request.get('feed'))
        user = google.appengine.ext.db.get(user_key)
        feed = google.appengine.ext.db.get(feed_key)
        feed_blob_info = feed.contents_blob_info
        feed_contents = StringIO.StringIO(feed.contents)
        if feed_blob_info:
            fi = feed_blob_info.open('r')
            feed_contents = StringIO.StringIO(fi.read())
            fi.close()
        parsed_feed = feedparser.parse(feed_contents)
        if 'title' in parsed_feed['feed']:
            feed.title = parsed_feed['feed']['title']
        else:
            feed.title = 'Unknown feed'
        for entry in parsed_feed['entries'][:10]:
            if 'id' in entry:
                entry_id = entry['id']
            elif len(entry.enclosures) >= 1:
                entry_id = entry.enclosures[0].href
            if (feed.url.startswith("http://www.giantbomb.com/videos")):
                # XXX Hack for Giant Bomb feed brokenness
                entry_id = '-'.join([entry.updated,entry.title])
            if entry_id:
                if len(entry.enclosures) >= 1:
                    enclosure = entry.enclosures[0].href
                    # See if it's already in the database
                    query = feedreader.models.entry.Entry.all()
                    query = query.filter('entry_id =', entry_id)
                    query = query.filter('user =', user.user)
                    query_result = query.fetch(1)
                    if not query_result: # Entry doesn't already exist
                        entry = feedreader.models.entry.Entry(user=user.user,
                            feed=feed.key(),
                            title=entry['title'],
                            enclosure=entry.enclosures[0].href,
                            entry_id=entry_id,
                            play_count=0,
                            updated_time=datetime.datetime(*entry.updated_parsed[0:6]),
                            timestamp=0)
                        entry.put()


class FetchScheduler(google.appengine.ext.webapp.RequestHandler):

    def get(self):
        self.post()

    def post(self):
        for feed in feedreader.models.feed.Feed.all():
            google.appengine.api.taskqueue.add(url='/async/fetch',
                params={'key': str(feed.key())})


class FetchWorker(google.appengine.ext.webapp.RequestHandler):

    def post(self):
        key = google.appengine.ext.db.Key(self.request.get('key'))
        feed = google.appengine.ext.db.get(key)
        try:
            if feed.username and feed.password:
                response = google.appengine.api.urlfetch.fetch(feed.url,
                    headers = {'Authorization': 'Basic ' +
                        base64.b64encode(feed.username + ':' + feed.password)})
            else:
                response = google.appengine.api.urlfetch.fetch(feed.url)
        except google.appengine.api.urlfetch.Error:
            raise # XXX Add error-handling logic
        if response.status_code == 200:
            if feed.contents_blob_info is not None:
                blob_info = feed.contents_blob_info
                blob_info.delete()
            file_name = google.appengine.api.files.blobstore.create()
            with google.appengine.api.files.open(file_name, 'a') as fi:
                fi.write(response.content)
            google.appengine.api.files.finalize(file_name)
            feed.contents_blob_info = google.appengine.ext.blobstore.BlobInfo.get(
                google.appengine.api.files.blobstore.get_blob_key(file_name))
            parsed_feed = feedparser.parse(response.content)
            feed.title = parsed_feed['feed'].get('title', 'Unknown')
            feed.last_fetched = datetime.datetime.now()
            feed.put()


class DeleteEntryWorker(google.appengine.ext.webapp.RequestHandler):

    def get(self):
        self.post()

    def post(self):
        deleted_count = 0
        cutoff = datetime.datetime.now() - datetime.timedelta(days=60)
        cutoff_str = str(cutoff).split('.')[0]
        for entry in feedreader.models.entry.Entry.gql(
                "WHERE updated_time < DATETIME('" + cutoff_str + "')"):
            entry.delete()
            deleted_count += 1
            if deleted_count >= 100:
                return


application = google.appengine.ext.webapp.WSGIApplication(
    [('/async/fetch', FetchWorker),
     ('/async/entry_schedule', EntryScheduler),
     ('/async/get_entries', EntryWorker),
     ('/async/delete_entries', DeleteEntryWorker),
     ('/async/url_schedule', FetchScheduler),],
    debug=True)


def main():
    google.appengine.ext.webapp.util.run_wsgi_app(application)


if __name__ == "__main__":
    main()
