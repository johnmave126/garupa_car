import * as RLocalStorage from 'meteor/simply:reactive-local-storage'
import { ReactiveVar } from 'meteor/reactive-var'


var pinned_room = new ReactiveVar();

Tracker.autorun(function() {
    Meteor.subscribe("rooms", {
        type: RLocalStorage.getItem('room_type'),
        day: RLocalStorage.getItem('room_day')
    });
});

function collectRating(room) {
    var rating = Reputation.findOne({creator_id: room.created_by_id}) || {up: 0, down: 0};
    var active_votes = Votes.find({creator_id: room.created_by_id}).fetch();
    for(var i = 0; i < active_votes.length; i++) {
        if(active_votes[i].rating === 1) {
            rating.up++;
        }
        else {
            rating.down++;
        }
    }
    return rating;
}

function modReputation(creator_id, old_rating, new_rating) {
    var modifier = {};
    if(old_rating === -1) {
        modifer['$inc'] = {down: -1};
    }
    else if(old_rating === 1) {
        modifer['$inc'] = {up: -1};
    }
    if(new_rating === -1) {
        modifer['$inc'] = {down: 1};
    }
    else if(new_rating === 1) {
        modifer['$inc'] = {up: 1};
    }
    if(!Reputation.findOne({creator_id: creator_id})) {
        Reputation.insert({creator_id: creator_id, up: 0, down: 0});
    }
    Reputation.update({creator_id: creator_id}, modifier);
}

Template.body.helpers({
    is_type(type) {
        return type == (RLocalStorage.getItem('room_type') || 'all');
    },
    room_types() {
        return [
            {type: '7w', text: '7W房'},
            {type: '12w', text: '12W房'},
            {type: 'all', text: '所有房'}
        ];
    },
    is_day(day) {
        return day == (RLocalStorage.getItem('room_day') || 'all');
    },
    room_days() {
        return [
            {day: 'special', text: '曜日房'},
            {day: 'normal', text: '普通房'},
            {day: 'all', text: '所有房'}
        ];
    },
    rooms() {
        return Rooms.find({}, {sort: {time: -1}});
    },
    pinned_room() {
        return pinned_room.get();
    },
    pin(room) {
        var vote = Votes.findOne({room_id: room._id});
        room.pinned = true;
        if(vote) {
            room.rating = vote.rating;
        }
        return room;
    }
});

Template.room.helpers({
    rating_icon() {
        var rating = collectRating(this);
        var total = rating.up + rating.down;
        if(total === 0) {
            return "glyphicon-record";
        }
        var positive_percent = rating.up / total;
        if(positive_percent > 0.85) {
            return "glyphicon-thumbs-up";
        }
        else if(positive_percent < 0.15) {
            return "glyphicon-thumbs-down";
        }
        return "glyphicon-sort";
    },
    rating_stats() {
        var rating = collectRating(this);
        var total = rating.up + rating.down;
        if(total === 0) {
            return "No rating yet";
        }
        return rating.up + " positive vote" + (rating.up > 1 ? "s" : "") + " vs. "
                + rating.down + " negative vote" + (rating.down > 1 ? "s" : "");
    },
    rated(rating) {
        return this.rating === rating;
    }
});

Template.body.onRendered(function() {
    $(document.body).on('change.tplbody', '#group_type', function(e) {
        RLocalStorage.setItem('room_type', e.target.dataset.type);
    });
    $(document.body).on('change.tplbody', '#group_day', function(e) {
        RLocalStorage.setItem('room_day', e.target.dataset.type);
    });
    $(document.body).on('click.tplbody', 'tbody > tr:not([pinned])', function(e) {
        var row = e.currentTarget;
        pinned_room.set(Rooms.findOne({_id: row.dataset.roomId}));
    });
    $(document.body).on('click.tplbody', 'tbody > tr[pinned="true"]', function(e) {
        pinned_room.set(null);
    });
    if(!RLocalStorage.getItem('room_type')) {
        RLocalStorage.setItem('room_type', 'all');
    };
    if(!RLocalStorage.getItem('room_day')) {
        RLocalStorage.setItem('room_day', 'all');
    }
});

Template.body.onDestroyed(function() {
    $(document.body).off('.tplbody');
});

Template.room.events({
    'click .rating-button': function(e) {
        var btn = e.target,
            new_rating = parseInt(btn.dataset.action);
        e.preventDefault();
        e.stopPropagation();
        if(this.rating !== new_rating) {
            if(Votes.findOne({room_id: this._id})) {
                Votes.update({room_id: this._id}, {$set: {rating: new_rating}});
            }
            else {
                if(Rooms.findOne({_id: this._id})) {
                    Votes.insert({
                        room_id: this._id,
                        time: this.time,
                        rating: new_rating,
                        creator_id: this.created_by_id
                    });
                }
                else {
                    modReputation(this.created_by_id, this.rating, new_rating);
                }
            }
            this.rating = new_rating;
        }
    }
});

Meteor.startup(function() {
    VotesObserver.refresh();
    ReputationObserver.refresh();

    var vote_cnt = Votes.find({}).count();
    if(vote_cnt > Meteor.settings.public.publish_size) {
        var votes = Votes.find({}, {sort: {time: -1}}).fetch();
        var pruned_id = [];
        for(var i = Meteor.settings.public.publish_size; i < votes.length; i++) {
            modReputation(votes[i].creator_id, null, votes[i].rating);
            pruned_id.push(votes[i]._id);
        }
        Votes.remove({_id: {$in: pruned_id}});
    }

    Rooms.find({}).observeChanges({
        removed(id) {
            var vote = Votes.findOne({room_id: id});
            if(vote) {
                modReputation(vote.creator_id, null, vote.rating);
                Votes.remove({_id: vote._id});
            }
        }
    });
});

