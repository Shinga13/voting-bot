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

function get_archived_votes(guild_id) {
    let votes_list = [];
    const archive_folder = path.join(archive_path, guild_id.toString())
    fs.readdirSync(
        archive_folder, { withFileTypes: true }
    ).filter(
        dir_or_file => !dir_or_file.isDirectory()
    ).forEach(
        file => votes_list.push(file.name)
    );
    return votes_list;
}

function get_archived_vote_data (guild_id, file_name) {
    const archive_file = path.join(archive_path, guild_id.toString(), file_name)
    return JSON.parse(fs.readFileSync(archive_file, { encoding: 'utf-8' }));
}

module.exports = {
    store_current_votes: store_current_votes,
    store_settings: store_settings,
    store_archived_vote: store_archived_vote,
    get_archived_votes: get_archived_votes,
    get_archived_vote_data: get_archived_vote_data
}