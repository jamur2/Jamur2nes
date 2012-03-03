import datetime
import feedreader.models.user
import feedreader.utils.debug
import google.appengine.api.users
import google.appengine.ext.db
import simplejson


def json_respond(response, entity):
    response.out.write(to_json(entity))


def sanitize_dict(obj):
    for key in obj:
        if type(obj[key]) == datetime.datetime:
            obj[key] = obj[key].isoformat()
    return obj


def to_json(entity):
    obj = {}
    for key in entity.properties().keys():
        obj[key] = getattr(entity, key)
        if isinstance(obj[key], google.appengine.ext.db.Model):
            # Object references serialize as a key
            obj[key] = str(obj[key].key())
        elif isinstance(obj[key], google.appengine.api.users.User):
            obj[key] = obj[key].user_id()
    obj['key'] = str(entity.key())
    obj = sanitize_dict(obj)
    return simplejson.dumps(obj)


def get_current_user():
    g_user = google.appengine.api.users.get_current_user()
    if not g_user: # Not logged in to google
        return None

    query = feedreader.models.user.User.all()
    query_result = query.filter('user =', g_user).fetch(1)
    if query_result: # App User exists
        user = query_result[0]
    else: # App User doesn't exist
        user = feedreader.models.user.User(user=g_user)
        user.put()
    return user
