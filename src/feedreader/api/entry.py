import feedreader.models.entry
import feedreader.utils
import google.appengine.api.datastore_errors
import google.appengine.ext.webapp
import google.appengine.ext.webapp.util
import json


class EntryAPI(google.appengine.ext.webapp.RequestHandler):

    def get(self):
        key = self.request.get('key')
        try:
            entity = google.appengine.ext.db.get(
                google.appengine.ext.db.Key(key))
        except google.appengine.api.datastore_errors.BadKeyError:
            error = json.dumps({'error': 'No such entry'})
            self.response.out.write(error)
            return
        feedreader.utils.json_respond(self.response, entity)

    def post(self):
        user = feedreader.utils.get_current_user()
        if not user:
            # Not logged in
            self.response.out.write("Log in, fool")
            return
        key = self.request.get('key')
        try:
            entry = google.appengine.ext.db.get(
                google.appengine.ext.db.Key(key))
        except google.appengine.api.datastore_errors.BadKeyError:
            error = json.dumps({'error': 'No such entry'})
            self.response.out.write(error)
            return

        # Set play count
        play_count = self.request.get('play_count')
        if play_count:
            entry.play_count = int(play_count)

        # Set timestamp
        timestamp = self.request.get('timestamp')
        if timestamp:
            entry.timestamp = int(timestamp)
        entry.put()
        feedreader.utils.json_respond(self.response, entry)



application = google.appengine.ext.webapp.WSGIApplication(
    [('/api/entry', EntryAPI),],
    debug=True)


def main():
    google.appengine.ext.webapp.util.run_wsgi_app(application)


if __name__ == "__main__":
    main()
