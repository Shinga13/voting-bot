const fs = require('node:fs');
const path = require('node:path');
const data_path = process.env.DATA_PATH;
const archive_path = path.join(data_path, 'voting_archive');
const vote_path = path.join(data_path, 'active_votes.json');
const settings_path = path.join(data_path, 'settings.json');

function create_guild_settings() {
    return {
        absolute_reminders: [],
        relative_reminders: [],
        primary_role: null,
        secondary_roles: [],
        registrations: {},
        display_rationales: true,
        dm_reminders: false,
        ping_reminders: true,
    };
}

function init_backend() {
    if (!fs.existsSync(data_path) || !fs.lstatSync(data_path).isDirectory()) {
        fs.mkdirSync(data_path);
    }
    if (!fs.existsSync(archive_path) || !fs.lstatSync(archive_path).isDirectory()) {
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
    let settings = {};
    try {
        saved_settings = JSON.parse(fs.readFileSync(settings_path, {encoding: 'utf-8', flag: 'r'}));
        for (let guild_id in saved_settings) {
            settings[guild_id] = {...create_guild_settings(), ...saved_settings[guild_id]};
        }
    }
    catch {
        fs.writeFileSync(settings_path, '{}', {encoding: 'utf-8', flag: 'w'});
    }
    let schedule = {};
    let guild_archive_path;
    for (let guild_id in settings) {
        schedule[guild_id] = {};
        guild_archive_path = path.join(archive_path, guild_id);
        if (!fs.existsSync(guild_archive_path) || !fs.lstatSync(guild_archive_path).isDirectory()) {
            fs.mkdirSync(guild_archive_path);
        }
    }
    return [active_votes, settings, schedule];
}

module.exports = {
    data_path: data_path,
    archive_path: archive_path,
    vote_path: vote_path,
    settings_path: settings_path,
    init_backend: init_backend,
    create_guild_settings: create_guild_settings
}