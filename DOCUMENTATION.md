# vote-create
### Description
This command creates a new vote in the channel it is used in. The bot creates an embed, that shows general information and the current state of the vote. When the vote opens, all voters will be notified by a message. Reminders can be set through the [vote-settings](#vote-settings) command. The vote will automatically close at the end date and 
is converted to an "archived vote", showing the result of the voting and disabling the voting functioniality. Archived votes are also saved on the bots server.
### Parameters
- `title` (required): Title of the vote, will be shown at the top of the embed. Must be unique among the currently active votes, as it is used to reference the vote internally and in commands.
- `subject`(required): Description or question of the vote shown on the embed. This text informs voters what they are voting for. May contain links or other Discord formatting.
- `start` (required): Time and date at which the vote will be opened. Given in "Unix Seconds". May be in the past, in which case the vote will be opened instantly.
- `end` (required): Time and date at which the vote will end. Given in "Unix Seconds". Must be after the given start time and in the future.

# vote-manage

## Description
This command is used to manipulate active votes. Only usable with one of the following subcommands (for example: `/vote-manage pause [...]`).

## delete
### Description
Deletes a single vote inlcuding all stored data and the embed. This cannot be undone. Deleted votes are not saved in the vote archive.
### Parameters
- `title` (required): Title of the vote to be deleted.

## edit
### Description
Edit an active vote. The title cannot be edited. When the start and / or end times are changed reminders are updated to match the new voting period.
### Parameters
- `title` (required): Title of the vote to edit.
- `subject`(optional): New description or question of the vote shown on the embed.
- `start` (optional): New time and date at which the vote will start. Given in "Unix Seconds".
- `end` (optional): New time and date at which the vote will end. Given in "Unix Seconds". Must be after the given start time and in the future.

## end
### Description
Close a vote as if the end date and time was reached. Converts the vote to an archived vote and stores it. Shows the result in the embed.
### Parameters
- `title` (required): Title of the vote to end.

## help
### Description
Shows a link to this repository.

## pause
### Description
Pauses voting on an active vote. This prevents anyone from casting votes. Using the command again unpauses the vote. If the vote is unpaused after the given end time, it must either be ended manually or edited with a new end date to have it automatically close at that date.
### Parameters
- `title` (required): Title of the vote to pause / unpause.

## purge
### Description
Deletes all active votes. This cannot be undone. Same restrictions as with [vote-manage delete](#delete) apply.


# vote-settings

## add-secondary-role
### Description
Adds a role to the pool of secondary roles. Instatly enables users with this role to vote.
### Parameters
- `role` (required): Role to add.

## help
### Description
Shows a link to this repository.

## register-voter
### Description
Manually registers voter.
### Parameters
- `voter` (required): User to register. If user is already registerd, registration will be overwritten.
- `ids` (required): List of identifications seperated by carets (`^`).

## remove-reminders
### Description
Removes all reminders. Active votes will be updated when paused and unpaused or edited.

## remove-secondary-role
### Description
Removes selected secondary role if it is a secondary role. Denies users with this role to vote. Already cast roles will become invalid when the vote ends.
### Parameters
- `role` (required): Role to remove.

## set-absolute-reminders
### Description
Sets reminders absolute to theend of the voting period. Active votes have to be edited or paused / unpaused for this to apply.
### Paramters
- `reminders` (required): Seconds before the voting ends seperated by carets (`^`). Value must be greater than 0. Votes ignore reminders that are longer than the voting period.

## set-primary-role
### Description
Sets the primary role.
### Paramters
- `role` (required): Role to set.

## set-relative-reminders
### Description
Sets reminders relative to the voting period. Active votes have to be edited or paused / unpaused for this to apply.
### Paramters
- `reminders` (required): Numbers between 0 and 1 seperated by carets (`^`). 0 and 1 are not allowed. 0 represents the start time and date of the vote; 1 represents the end time of the vote.

## show-rationales
### Description
Enables / disables display of anonymized vote rationales when vote ends.
### Parameters
- `enabled` (required): True / False. True enables the feature, False diables it.

## un-register-voter
### Description
Manually unregisters a voter. Denies this user to vote. Already cast roles will become invalid when the vote ends.
### Parameters
- `voter` (required): User to unregister.
