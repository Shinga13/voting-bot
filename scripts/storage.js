const fs = require('node:fs');
const path = require('node:path');
const { settings_path, vote_path, archive_path } = require('./setup.js');

function store_current_votes(vote_object) {
    fs.writeFileSync(vote_path, JSON.stringify(vote_object), { encoding: 'utf-8' })
}

function store_settings(settings_object) {
    fs.writeFileSync(settings_path, JSON.stringify(settings_object), { encoding: 'utf-8' })
}

function store_archived_vote(vote_object) {
    let file_name = `${Date.now()}.json`;
    let file_path = path.join(archive_path, file_name);
    let attempts = 0;
    while (fs.existsSync(file_path)) {
        if (attempts >= 5) {
            console.log('[WARNING] store_archived_vote: vote could not be stored because filenames were already taken');
            return;
        }
        file_name = `${Date.now()}.${attempts}.json`;
        file_path = path.join(archive_path, file_name);
        attempts++;
    }
    fs.writeFileSync(file_path, JSON.stringify(vote_object), { encoding: 'utf-8' });
}

module.exports = {
    store_current_votes: store_current_votes,
    store_settings: store_settings,
    store_archived_vote: store_archived_vote,
}