import google.appengine.ext.webapp
import google.appengine.ext.webapp.util


class Redirector(google.appengine.ext.webapp.RequestHandler):

    def get(self):
        self.redirect('/ui/index.html')


application = google.appengine.ext.webapp.WSGIApplication(
    [('/', Redirector),],
    debug=True)


def main():
    google.appengine.ext.webapp.util.run_wsgi_app(application)


if __name__ == "__main__":
    main()
