import { Meteor } from 'meteor/meteor'
import { PersistentMinimongo2 as LMongo } from 'meteor/frozeman:persistent-minimongo2'

function processRoom(room) {
    var cdate = new Date(Date.parse(room.created_at));
    room.body = room.body.trim();
    room.number = room.body.match(/\d\d\d\d\d/);
    room.date = cdate.toString().slice(16, 24);
    return room;
}

Rooms = new Meteor.Collection("rooms", {transform: processRoom});
Votes = new Meteor.Collection("votes", {connection: null});
VotesObserver = new LMongo(Votes, "garupaCar");
Reputation = new Meteor.Collection("reputation", {connection: null});
ReputationObserver = new LMongo(Reputation, "garupaCar");

