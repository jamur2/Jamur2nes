import feedreader.models.entry
import feedreader.models.feed
import feedreader.models.user
import feedreader.utils
import google.appengine.api.users
import google.appengine.ext.webapp
import google.appengine.ext.webapp.util
import json


class UserAPI(google.appengine.ext.webapp.RequestHandler):

    def get(self):
        response = {
            'login_url': None,
            'logout_url': None,
            'nickname': None,
            'logged_in': False,
        }
        user = feedreader.utils.get_current_user()
        if not user:
            response['login_url'] = (
                google.appengine.api.users.create_login_url('/ui/index.html'))
        else:
            response['logged_in'] = True
            response['nickname'] = user.user.nickname()
            response['logout_url'] = (
                google.appengine.api.users.create_logout_url('/ui/index.html'))
        self.response.out.write(json.dumps(response))


class SubscriptionsAPI(google.appengine.ext.webapp.RequestHandler):

    def get(self):
        user = feedreader.utils.get_current_user()
        feeds = [str(feed) for feed in user.feeds]
        self.response.out.write(json.dumps(feeds))


class EntriesAPI(google.appengine.ext.webapp.RequestHandler):
    def get(self):
        user = feedreader.utils.get_current_user()
        query = feedreader.models.entry.Entry.all()
        query.filter('user =', user.user)
        feed = self.request.get('feed')
        if feed:
            try:
                entity = google.appengine.ext.db.get(
                    google.appengine.ext.db.Key(feed))
                query.filter('feed =', entity)
                query.order('-updated_time')
            except google.appengine.api.datastore_errors.BadKeyError:
                error = json.dumps({'error': 'No such feed'})
                self.response.out.write(error)
                return
        entries = query.fetch(10)
        entries = [str(entry.key()) for entry in entries]
        self.response.out.write(json.dumps(entries))


class UnlistenedAPI(google.appengine.ext.webapp.RequestHandler):

    def get(self):
        user = feedreader.utils.get_current_user()
        query = feedreader.models.entry.Entry.all()
        query.filter('user =', user.user)
        query.filter('play_count =', 0)
        query.order('-updated_time')
        entries = query.fetch(10)
        entries = [str(entry.key()) for entry in entries]
        self.response.out.write(json.dumps(entries))


application = google.appengine.ext.webapp.WSGIApplication(
    [('/api/user', UserAPI),
     ('/api/user/subscriptions', SubscriptionsAPI),
     ('/api/user/unlistened', UnlistenedAPI),
     ('/api/user/entries', EntriesAPI),],
    debug=True)


def main():
    google.appengine.ext.webapp.util.run_wsgi_app(application)


if __name__ == "__main__":
    main()
