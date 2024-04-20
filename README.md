# voting-bot
## About
Discord bot for conducting secret votes. Vote options are "Yes", "No" and "Abstain". Voters are required to give a rationale for their vote.

Functionality:
- create votes (supports multiple votes to be active simultaneously)
- voting process is done through button interactions; cast votes can only be seen by the user casting it
- votes can be shown, edited and deleted at will by the voter
- vote automatically opens and closes at given times; outside the voting period, voting is not possible
- results are dispayed once voting ends, with the option to show anonymized rationales
- only users with specific roles can vote; users can be registered manually if using roles is not desired
- reminders are sent when the vote opens and at specified times during voting

## Getting Started
*Slash commands used to manage the bot are available to users with the "Manage Events" permission.*<br>
First, set up voting permissions. You can do this either by setting roles or manually registering the voters. Both methods also work alongside each other, with the manual registration taking priority over identification by role (if a user is manually registered, the bot does not attempt to identify the user by role). To set up role voting permissionss, start with setting a primary role with [/vote-settings set-primary-role](./DOCUMENTATION.md#set-primary-role) 

