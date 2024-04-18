const fs = require('node:fs');
const path = require('node:path');
const data_path = process.env.DATA_PATH;
const archive_path = path.join(data_path, 'voting_archive');
const vote_path = path.join(data_path, 'active_votes.json');
const settings_path = path.join(data_path, 'settings.json');

function init_backend() {
    if (!fs.existsSync(data_path) || !fs.lstatSync(data_path).isDirectory()) {
        fs.mkdirSync(data_path);
        fs.mkdirSync(archive_path);
    }
    if (!fs.existsSync(vote_path)) {
        fs.writeFileSync(vote_path, '{}', {encoding: 'utf-8', flag: 'w'});
    }
    let active_votes;
    try {
        active_votes = JSON.parse(fs.readFileSync(vote_path, {encoding: 'utf-8', flag: 'r'}));
    }
    catch {
        active_votes = {};
        fs.writeFileSync(vote_path, '{}', {encoding: 'utf-8', flag: 'w'});
    }
    if (!fs.existsSync(settings_path)) {
        fs.writeFileSync(settings_path, '{}', {encoding: 'utf-8', flag: 'w'});
    }
    let settings;
    try {
        settings = JSON.parse(fs.readFileSync(settings_path, {encoding: 'utf-8', flag: 'r'}));
    }
    catch {
        settings = {};
        fs.writeFileSync(settings_path, '{}', {encoding: 'utf-8', flag: 'w'});
    }
    return [active_votes, settings];
}

module.exports = {
    data_path: data_path,
    archive_path: archive_path,
    vote_path: vote_path,
    settings_path: settings_path,
    init_backend: init_backend
}