import { TwitMaker } from 'meteor/mrt:twit';

Meteor.publish("rooms", function(filter) {
    var selector = {};
    switch(filter.type) {
        case '7w':
        case '12w':
            selector.type = filter.type;
            break;
        case 'all':
        default:
            break;
    }
    switch(filter.day) {
        case 'special':
        case 'normal':
            selector.day_special = filter.day == 'special';
            break;
        case 'all':
        default:
            break;
    }
    return Rooms.find(selector, {sort: {time: -1}, limit: 50});
});

function mutate(tweet) {
    var body = tweet.text;
    var ranges = [];
    var i;
    for(i = 0; i < tweet.entities.hashtags.length; i++) {
        ranges.push(tweet.entities.hashtags[i].indices);
    }
    for(i = 0; i < tweet.entities.urls.length; i++) {
        ranges.push(tweet.entities.urls[i].indices);
    }
    for(i = 0; i < tweet.entities.user_mentions.length; i++) {
        ranges.push(tweet.entities.user_mentions[i].indices);
    }
    ranges.sort(function(a, b) {
        return b[0] - a[0];
    });
    for(i = 0; i < ranges.length; i++) {
        body = body.slice(0, ranges[i][0]) + body.slice(ranges[i][1]);
    }
    return body.replace(
        /[\uff01-\uff5e]/g,
        function(ch) {
            return String.fromCharCode(ch.charCodeAt(0) - 0xfee0);
        }
    );
}

function make_room(tweet, text) {
    return {
        created_by_id: tweet.user.id_str,
        created_by: '@' + tweet.user.screen_name,
        created_at: tweet.created_at,
        time: parseInt(tweet.timestamp_ms),
        body: text,
        type: text.match('ベテ') ? '12w' : '7w',
        day_special: !!text.match('曜')
    };

}

function is_room(text) {
    return text.match(/\d\d\d\d\d/);
}

Meteor.startup(function() {
    var Twit = new TwitMaker({
        consumer_key: Meteor.settings.consumer_key,
        consumer_secret: Meteor.settings.consumer_secret,
        access_token: Meteor.settings.access_token,
        access_token_secret: Meteor.settings.access_token_secret
    });

    var stream = Twit.stream('statuses/filter', { track: ['#ガルパ協力', '#バンドリ協力'] });
    stream.on('tweet', Meteor.bindEnvironment(function(tweet) {
        var text = mutate(tweet);
        if(is_room(text)) {
            Rooms.insert(make_room(tweet, text));
        }
    }));

    SyncedCron.add({
        name: 'Delete old tweets',
        schedule: function(parser) {
            return parser.cron('8 0 * * ? *');
        },
        job: function() {
            var now = new Date();
            now.setDate(c.getDate() - 1);
            Rooms.remove({time: {$lt: now.getTime()}});
        }
    });
    SyncedCron.start();
});
