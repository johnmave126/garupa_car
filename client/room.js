import * as RLocalStorage from 'meteor/simply:reactive-local-storage'
import { ReactiveVar } from 'meteor/reactive-var'


var pinned_room = new ReactiveVar();
//TODO: Click on a tr to focus on it(stick it to top), can block creator after sticking

Tracker.autorun(function() {
    Meteor.subscribe("rooms", {
        type: RLocalStorage.getItem('room_type'),
        day: RLocalStorage.getItem('room_day')
    });
});


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
        room.pinned = true;
        return room;
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
