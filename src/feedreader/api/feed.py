import feedreader.models.feed
import feedreader.utils
import feedreader.utils.debug
import google.appengine.api.taskqueue
import google.appengine.ext.db
import google.appengine.ext.webapp
import google.appengine.ext.webapp.util
import simplejson
import sys

class FeedAPI(google.appengine.ext.webapp.RequestHandler):

    def get(self):
        key = self.request.get('key')
        try:
            entity = google.appengine.ext.db.get(
                google.appengine.ext.db.Key(key))
        except google.appengine.api.datastore_errors.BadKeyError:
            error = simplejson.dumps({'error': 'No such feed'})
            self.response.out.write(error)
            return
        feedreader.utils.json_respond(self.response, entity)

    def delete(self):
        user = feedreader.utils.get_current_user()
        if not user:
            # Not logged in
            error = simplejson.dumps({'error': 'Not logged in'})
            self.response.out.write(error)
            return
        try:
            key = google.appengine.ext.db.Key(self.request.get('key'))
            feed = google.appengine.ext.db.get(key)
        except google.appengine.api.datastore_errors.BadKeyError:
            error = simplejson.dumps({'error': 'No such feed'})
            self.response.out.write(error)
            return
        success = False
        if key in user.feeds:
            user.feeds.remove(key)
            success = True
        user.put()
        if success:
            response = simplejson.dumps({'success': True})
        else:
            response = simplejson.dumps({
                'error': "Couldn't find subscription"})
        self.response.out.write(response)

    def post(self):
        user = feedreader.utils.get_current_user()
        if not user:
            # Not logged in
            self.response.out.write("Log in, fool")
            return

        url = self.request.get('url')
        username = self.request.get('username')
        password = self.request.get('password')
        query = feedreader.models.feed.Feed.all()
        query.filter('url =', url)
        query.filter('username =', username)
        query.filter('password =', password)
        query_result = query.fetch(1)
        if query_result:  # Feed already exists
            feed = query_result[0]
        else: # Feed doesn't exist
            feed = feedreader.models.feed.Feed(url=url)
            if username and password:
                feed.username = username
                feed.password = password
            feed.put()
            key = feed.key()
            google.appengine.api.taskqueue.add(url='/async/fetch',
                params={'key': key})
        if feed.key() not in user.feeds:
            user.feeds.append(feed.key())
            user.put()
            google.appengine.api.taskqueue.add(url='/async/get_entries',
                    params={'user': str(user.key()), 'feed': feed.key()},
                    countdown=3)
        feedreader.utils.json_respond(self.response, feed)


application = google.appengine.ext.webapp.WSGIApplication(
    [('/api/feed', FeedAPI),],
    debug=True)


def main():
    google.appengine.ext.webapp.util.run_wsgi_app(application)


if __name__ == "__main__":
    main()
