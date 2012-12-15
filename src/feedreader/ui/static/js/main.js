dojo.require("dijit.form.Button");
dojo.require("dijit.Dialog");
dojo.require("dijit.form.TextBox");
dojo.require("dijit.form.Form");

var feedreader = {};

feedreader.current_subscriptions = {};
feedreader.current_entries = {};
feedreader.selected_feed = null;
feedreader.selected_entry = null;

dojo.addOnLoad(function() {
    feedreader.update_login_button = function(response)
    {
        var button = null;
        if (response.logged_in)
        {
            dojo.byId("account-nick").innerHTML = ("Logged in: " +
                response.nickname);
            button = new dijit.form.Button({
                    label: "Log out",
                    onClick: function(){
                        window.location = response.logout_url;
                    }
                }, 'toggle-login-state');
        }
        else
        {
            dojo.byId("account-nick").innerHTML = "Not logged in.";
            button = new dijit.form.Button({
                    label: "Log in",
                    onClick: function(){
                        window.location = response.login_url;
                    }
                }, 'toggle-login-state');
        }
        dojo.byId("login-div");
    };

    feedreader.on_entry_timestamp_updated = function(response)
    {
        var entry = eval('(' + response + ')');
        feedreader.current_entries[entry.key] = entry;
        feedreader.redraw_entry(entry);
    };

    feedreader.on_media_error = function(error_event)
    {
    };

    feedreader.on_ended = function(end_event)
    {
        feedreader.on_increment_playcount(end_event);
    };

    feedreader.on_increment_playcount = function(increment_event)
    {
        dojo.xhrPost({
            url: "/api/entry",
            content: {key: feedreader.selected_entry,
                timestamp: 0,
                play_count: parseInt(feedreader.current_entries[feedreader.selected_entry].play_count + 1, 10)},
            load: feedreader.on_entry_timestamp_updated
        });
        var increment_playcount_button = dojo.byId("button-mark-as-played");
        var player_element = dojo.byId("player-div");
        if (increment_playcount_button)
        {
            player_element.removeChild(increment_playcount_button);
        }
    };

    feedreader.on_pause = function(pause_event)
    {
        if (pause_event.target.currentTime + 60 < pause_event.target.duration)
        {
            dojo.xhrPost({
                url: "/api/entry",
                content: {key: feedreader.selected_entry,
                    timestamp: parseInt(pause_event.target.currentTime, 10)},
                    load: feedreader.on_entry_timestamp_updated
            });
        }
    };

    feedreader.on_play = function(play_event)
    {
        feedreader.disable_pause_event = false;
        play_event.target.currentTime = feedreader.current_entries[feedreader.selected_entry].timestamp;
    };

    feedreader.on_entry_select = function(selected_entry_key)
    {
        var selected_entry_element = dojo.byId("entrytitle-" + selected_entry_key);
        selected_entry_element.style.cssText = "font-weight:bold"; // XXX use real CSS
        var entry_key = null
        for (entry_key in feedreader.current_entries)
        {
            if (feedreader.current_entries.hasOwnProperty(entry_key))
            {
                var entry_element = dojo.byId("entrytitle-" + entry_key);
                if (entry_element !== selected_entry_element)
                {
                    entry_element.style.cssText = ""; // XXX use real CSS
                }
            }
        }
        feedreader.selected_entry = selected_entry_key;
        var content_url = feedreader.current_entries[selected_entry_key].enclosure;
        var player_element = dojo.byId("player-div");
        player_element.innerHTML = "";
        var media_element = null;
        if (content_url.indexOf(".mp4") >= 0 || content_url.indexOf(".m4v") >= 0)
        {
            media_element = document.createElement("video");
        }
        else
        {
            media_element = document.createElement("audio");
        }
        media_element.src = content_url;
        media_element.controls = true;
        dojo.connect(media_element, "onpause", feedreader.on_pause);
        dojo.connect(media_element, "onplay", feedreader.on_play);
        dojo.connect(media_element, "onended", feedreader.on_ended);
        dojo.connect(media_element, "onerror", feedreader.on_media_error);
        dojo.connect(media_element, "ondurationchange", feedreader.on_duration_change);
        var title_element = document.createElement("div");
        title_element.textContent = feedreader.current_entries[selected_entry_key].title;
        title_element.style.cssText = "font-weight:bold"; // XXX use real CSS
        player_element.appendChild(media_element);
        player_element.appendChild(title_element);
        var download_element = document.createElement("a");
        download_element.textContent = "Download";
        download_element.href = content_url;
        player_element.appendChild(download_element);
        var play_count = feedreader.current_entries[selected_entry_key].play_count;
        if (play_count == 0)
        {
            var mark_as_played_element = document.createElement("button");
            mark_as_played_element.textContent = "Mark as Played";
            mark_as_played_element.id = "button-mark-as-played";
            dojo.connect(mark_as_played_element, "onclick", feedreader.on_increment_playcount);
            player_element.appendChild(mark_as_played_element);
        }
    };

    feedreader.on_duration_change = function(event)
    {
        var selected_entry_key = feedreader.selected_entry;
        var player_element = dojo.byId("player-div");
        var media_element = player_element.childNodes[0];
        var duration_min = Math.floor(media_element.duration / 60);
        var duration_sec = Math.floor(media_element.duration % 60);
        if (duration_sec < 10)
        {
            duration_sec = '0' + duration_sec;
        }
        var title_element = player_element.childNodes[1];
        title_element.textContent = feedreader.current_entries[selected_entry_key].title + " (" + duration_min + ":" + duration_sec + ")";
    };

    feedreader.redraw_entry = function(entry)
    {
        var entry_element = dojo.byId("entrytitle-" + entry.key);
        var content = entry.title;
        var play_count = entry.play_count;
        if (play_count === 0)
        {
            content = content + " (unplayed)";
        }
        entry_element.innerHTML = content;
    };

    feedreader.redraw_current_entries = function()
    {
        var entries_widget = dojo.byId("entries-div");
        var subscription_title = dojo.byId("subscription-title-div");
        var entry_key = null;
        subscription_title.textContent = feedreader.current_subscriptions[feedreader.selected_feed].title;
        var on_select_func = function(e_key)
        {
            return function (e)
            {
                return feedreader.on_entry_select(e_key);
            };
        };
        for (entry_key in feedreader.current_entries)
        {
            if (feedreader.current_entries.hasOwnProperty(entry_key))
            {
                var entry_container = dojo.byId("entry-" + entry_key);
                if (!entry_container)
                {
                    entry_container = document.createElement("div");
                    entry_container.id = "entry-" + entry_key;
                    entries_widget.appendChild(entry_container);
                    var entry_select = document.createElement("button");
                    entry_select.id = "entryselect-" + entry_key;
                    entry_select.textContent = "Select";
                    entry_container.appendChild(entry_select);
                    var entry_element = document.createElement("span");
                    entry_element.id = "entrytitle-" + entry_key;
                    entry_container.appendChild(entry_element);
                    dojo.connect(entry_select, "onclick",
                        on_select_func(entry_key));
                }
                if (feedreader.current_entries[entry_key])
                {
                    feedreader.redraw_entry(feedreader.current_entries[entry_key]);
                }
            }
        }
    };

    feedreader.on_get_entry_status = function(response)
    {
        var entry = eval('(' + response + ')');
        feedreader.current_entries[entry.key] = entry;
        feedreader.redraw_current_entries();
    };

    feedreader.on_subscription_deleted = function(subscription_key)
    {
        delete feedreader.current_subscriptions[subscription_key];
        var subscriptions_widget = dojo.byId("subscriptions-div");
        var subscription_container = dojo.byId("subscription-" + subscription_key);
        subscriptions_widget.removeChild(subscription_container);
        feedreader.redraw_current_subscriptions();
    };

    feedreader.on_get_entries_status = function(response)
    {
        var i;
        var entries_keys = eval('(' + response + ')');
        feedreader.current_entries = {};
        for (i = 0; i < entries_keys.length; i += 1) {
            feedreader.current_entries[entries_keys[i]] = null;
            dojo.xhrGet({
                url: "/api/entry",
                content: {'key': entries_keys[i]},
                load: feedreader.on_get_entry_status
            });
        }
        feedreader.redraw_current_entries();
    };

    feedreader.update_current_entries = function()
    {
        dojo.xhrGet({
            url: "/api/user/entries",
            content: {'feed': feedreader.selected_feed},
            load: feedreader.on_get_entries_status
        });
    };

    feedreader.on_subscription_edit = function(subscription_key)
    {
        var edit_dialog = new dijit.Dialog({
            title: 'Edit Subscription'
        });
        var current_subscription = feedreader.current_subscriptions[subscription_key];
        var title_display = document.createElement("div");
        title_display.textContent = "Title: " + current_subscription.title;
        edit_dialog.containerNode.appendChild(title_display);
        var url_display = document.createElement("div");
        url_display.textContent = "URL: " + current_subscription.url;
        edit_dialog.containerNode.appendChild(url_display);
        var confirm_button = new dijit.form.Button({
                label: "OK",
                onClick: function(){
                    edit_dialog.hide();
                }
            });
        edit_dialog.containerNode.appendChild(confirm_button.domNode);
        var delete_button = new dijit.form.Button({
                label: "Delete",
                onClick: function(){
                    dojo.xhrDelete({
                        url: "/api/feed",
                        content: {key: subscription_key},
                        load: feedreader.on_subscription_deleted(subscription_key)
                    });
                    edit_dialog.hide();
                }
            });
        edit_dialog.containerNode.appendChild(delete_button.domNode);
        edit_dialog.show();
    };

    feedreader.on_subscription_select = function(selected_subscription_key)
    {
        var selected_subscription_element = dojo.byId("subscriptiontitle-" + selected_subscription_key);
        selected_subscription_element.style.cssText = "font-weight:bold"; // XXX use real CSS
        var subscription_key = null;
        for (subscription_key in feedreader.current_subscriptions)
        {
            if (feedreader.current_subscriptions.hasOwnProperty(subscription_key))
            {
                var subscription_element = dojo.byId("subscriptiontitle-" + subscription_key);
                if (subscription_element !== selected_subscription_element)
                {
                    subscription_element.style.cssText = ""; // XXX use real CSS
                }
            }
        }
        feedreader.selected_feed = selected_subscription_key;
        var entries_widget = dojo.byId("entries-div");
        entries_widget.innerHTML = "";
        feedreader.update_current_entries();
    };

    feedreader.redraw_subscription = function(subscription_key)
    {
        var subscription_element = dojo.byId("subscriptiontitle-" + subscription_key);
        var content = "";
        if (feedreader.current_subscriptions[subscription_key])
        {
            content = feedreader.current_subscriptions[subscription_key].title;
            if (!content)
            {
                content = "Still fetching.  Please try again later.";
            }
        }
        else
        {
            content = "Loading subscription...";
        }
        subscription_element.innerHTML = content;
    };

    feedreader.redraw_current_subscriptions = function()
    {
        var subscriptions_widget = dojo.byId("subscriptions-div");
        var on_select_func = function(s_key)
        {
            return function (e)
            {
                return feedreader.on_subscription_select(s_key);
            };
        };
        var on_edit_func = function(s_key)
        {
            return function (e)
            {
                return feedreader.on_subscription_edit(s_key);
            };
        };
        var subscription_key = null;
        for (subscription_key in feedreader.current_subscriptions)
        {
            if (feedreader.current_subscriptions.hasOwnProperty(subscription_key))
            {
                var subscription_container = dojo.byId("subscription-" + subscription_key);
                if (!subscription_container)
                {
                    subscription_container = document.createElement("div");
                    subscription_container.id = "subscription-" + subscription_key;
                    subscriptions_widget.appendChild(subscription_container);
                    var subscription_select = document.createElement("button");
                    subscription_select.id = "subscriptionselect-" + subscription_key;
                    subscription_select.textContent = "Select";
                    subscription_container.appendChild(subscription_select);
                    var subscription_edit = document.createElement("button");
                    subscription_edit.id = "subscriptionedit-" + subscription_key;
                    subscription_edit.textContent = "Edit";
                    subscription_container.appendChild(subscription_edit);
                    var subscription_element = document.createElement("span");
                    subscription_element.id = "subscriptiontitle-" + subscription_key;
                    subscription_container.appendChild(subscription_element);
                    dojo.connect(subscription_select, "onclick",
                        on_select_func(subscription_key));
                    dojo.connect(subscription_edit, "onclick",
                        on_edit_func(subscription_key));
                }
                feedreader.redraw_subscription(subscription_key);
            }
        }
    };

    feedreader.on_get_subscription_status = function(response)
    {
        var subscription = eval('(' + response + ')');
        feedreader.current_subscriptions[subscription.key] = subscription;
        feedreader.redraw_current_subscriptions();
    };

    feedreader.on_get_subscriptions_status = function(response)
    {
        var i;
        var subscription_keys = eval('(' + response + ')');
        feedreader.current_subscriptions = {};
        for (i = 0; i < subscription_keys.length; i += 1) {
            feedreader.current_subscriptions[subscription_keys[i]] = null;
            dojo.xhrGet({
                url: "/api/feed",
                content: {'key': subscription_keys[i]},
                load: feedreader.on_get_subscription_status
            });
        }
        feedreader.redraw_current_subscriptions();
    };

    feedreader.refresh_subscriptions_status = function()
    {
        dojo.xhrGet({
            url: "/api/user/subscriptions",
            load: feedreader.on_get_subscriptions_status
        });
    };

    feedreader.on_subscription_add = function(response, args)
    {
        feedreader.refresh_subscriptions_status();
    };

    feedreader.add_subscription = function()
    {
        var add_dialog = new dijit.Dialog({
            title: 'Add Subscription'
        });
        var url_display = document.createElement("div");
        var url_label = document.createElement("span");
        url_display.textContent = "URL: ";
        var url_entry = new dijit.form.TextBox({
            name: 'url',
            value: ''
        });
        url_display.appendChild(url_label);
        url_display.appendChild(url_entry.domNode);
        var username_display = document.createElement("div");
        var username_label = document.createElement("span");
        username_display.textContent = "Username: ";
        username_display.appendChild(username_label);
        var username_entry = new dijit.form.TextBox({
            name: 'username',
            value: ''
        });
        username_display.appendChild(username_entry.domNode);
        var password_display = document.createElement("div");
        var password_label = document.createElement("span");
        password_display.textContent = "Password: ";
        password_display.appendChild(password_label);
        var password_entry = new dijit.form.TextBox({
            name: 'password',
            value: ''
        });
        password_display.appendChild(password_entry.domNode);
        var explain_display = document.createElement("div");
        explain_display.textContent = "Username and password are only needed for authenticated feeds";
        add_dialog.containerNode.appendChild(url_display);
        add_dialog.containerNode.appendChild(username_display);
        add_dialog.containerNode.appendChild(password_display);
        add_dialog.containerNode.appendChild(explain_display);
        var add_button = new dijit.form.Button({
                label: "Add",
                onClick: function(){
                    add_dialog.hide();
                    dojo.xhrPost({
                        url: "/api/feed",
                        content: {url: url_entry.value,
                            username: username_entry.value,
                            password: password_entry.value},
                        load: feedreader.on_subscription_add
                    });
                }
            });
        add_dialog.containerNode.appendChild(add_button.domNode);
        add_dialog.show();
    };

    feedreader.activate_subscription_adder = function()
    {
        dojo.byId("input_subscription_button").onclick = feedreader.add_subscription;
    };

    feedreader.on_get_login_state = function(response, args){
        response = eval('(' + response + ')');
        feedreader.update_login_button(response);
        if (response.logged_in)
        {
            feedreader.refresh_subscriptions_status();
            feedreader.activate_subscription_adder();
        }
    };

    feedreader.get_login_state = function(){
        dojo.xhrGet({
            url: "/api/user",
            load: feedreader.on_get_login_state
        });
    };

    dojo.ready(function(){
        feedreader.get_login_state();
    });
});
