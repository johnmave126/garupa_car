import * as RLocalStorage from 'meteor/simply:reactive-local-storage'

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
        return Rooms.find({}, {sort: {time: -1}}).map(function(room) {
            var body = room.body.trim();
            var number = body.match(/\d\d\d\d\d/);
            var type = body.match('ベテ') ? '12w' : '7w';
            var cdate = new Date(Date.parse(room.created_at));
            var date = cdate.toString().slice(16, 24);
            return {creator_id: room.created_by_id, type: type, number: number, date: date, body: body};
        });
    },
    room_pinned() {
        return RLocalStorage.getItem('room_pinned');
    },
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
        var room = {
            type: row.children[0].innerHTML,
            number: row.children[1].innerHTML,
            date: row.children[2].innerHTML,
            body: row.children[3].innerHTML,
            pinned: true,
        };
        RLocalStorage.setItem('room_pinned', room);
    });
    $(document.body).on('click.tplbody', 'tbody > tr[pinned="true"]', function(e) {
        RLocalStorage.setItem('room_pinned', null);
    });
    if(!RLocalStorage.getItem('room_type')) {
        RLocalStorage.setItem('room_type', 'all');
    };
    if(!RLocalStorage.getItem('room_day')) {
        RLocalStorage.setItem('room_day', 'all');
    }
});

Template.body.onCreated(function() {
    $(document.body).off('.tplbody');
});
