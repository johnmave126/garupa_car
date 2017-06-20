function processRoom(room) {
    var cdate = new Date(Date.parse(room.created_at));
    room.body = room.body.trim();
    room.number = room.body.match(/\d\d\d\d\d/);
    room.type = room.body.match('ベテ') ? '12w' : '7w';
    room.date = cdate.toString().slice(16, 24);
    return room;
}

Rooms = new Meteor.Collection("rooms", {transform: processRoom});

