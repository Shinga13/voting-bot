const fs = require('node:fs');
const path = require('node:path');
const { settings_path, vote_path, archive_path } = require('./setup.js');

function store_current_votes(vote_object) {
    fs.writeFileSync(vote_path, JSON.stringify(vote_object), { encoding: 'utf-8' })
}

function store_settings(settings_object) {
    fs.writeFileSync(settings_path, JSON.stringify(settings_object), { encoding: 'utf-8' })
}

function store_archived_vote(vote_object, guild_id) {
    let file_name = `${vote_object.title}.${vote_object.start_timestamp}.json`;
    let file_path = path.join(archive_path, guild_id, file_name);
    let attempts = 0;
    try {
        fs.writeFileSync(file_path, JSON.stringify(vote_object), { encoding: 'utf-8' });
    }
    catch {
        while (fs.existsSync(file_path)) {
            if (attempts >= 5) {
                console.log('[WARNING] store_archived_vote: vote could not be stored because '
                        + 'filenames were already taken');
                console.log(vote_object);
                return;
            }
            file_name = `vote.${vote_object.start_timestamp}.${attempts}.json`;
            file_path = path.join(archive_path, guild_id, file_name);
            attempts++;
        }
        try {
            fs.writeFileSync(file_path, JSON.stringify(vote_object), { encoding: 'utf-8' });
        }
        catch {
            console.log('[WARNING] store_archived_vote: vote could not be stored because '
                    + 'filenames were already taken');
            console.log(vote_object);
            return;
        }
    }
}

module.exports = {
    store_current_votes: store_current_votes,
    store_settings: store_settings,
    store_archived_vote: store_archived_vote,
}