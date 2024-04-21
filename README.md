# voting-bot
## About
Discord bot for conducting secret votes. Vote options are "Yes", "No" and "Abstain". Voters are required to give a rationale for their vote.

Functionality:
- create votes (supports multiple votes to be active simultaneously)
- voting process is done through button interactions; cast votes can only be seen by the user casting it
- votes can be shown, edited and deleted at will by the voter
- vote automatically opens and closes at given times; outside the voting period, voting is not possible
- results are displayed once voting ends, with the option to show anonymized rationales
- only users with specific roles can vote; users can be registered manually if using roles is not desired
- reminders are sent when the vote opens and at specified times during voting

## Getting Started
*Slash commands used to manage the bot are available to users with the "Manage Events" permission.*

Firstly, set up voting permissions. You can do this either by setting roles or manually registering the voters. Both methods also work alongside each other, with the manual registration taking priority over identification by role (if a user is manually registered, the bot does not attempt to identify the user by role). To set up role voting permissionss, start with setting a primary role using the [/vote-settings set-primary-role](./DOCUMENTATION.md#set-primary-role) command. Then add as many secondary roles as needed with the [/vote-settings add-secondary-role](./DOCUMENTATION.md#add-secondary-role) command. Now every user on the server that has the primary role and at least one secondary role is able to vote. The primary role enables the user to vote, while the secondary role acts as identification. A user may vote once for each secondary role they have. When the user votes the identification will be automatically selected, if the user has only one, or the user will be prompted to select one of their identifications. To manually register a voter, use the [/vote-settings register-voter](./DOCUMENTATION.md#register-voter) command. You can add as many identifications per user as you want; the user will be able to vote once per identification.

Secondly, make sure that the bot is allowed to ping all roles to enable it to actually notify the voters when the voting starts. You can also choose to edit a few settings:
- Showing rationales: Use the [/vote-settings show-rationales](./DOCUMENTATION.md#show-rationales) command to enable / disable the feature. When enabled the rationales of all votes will be displayed publicily, grouped by decision and in anonymous form in the channel the voting took place as soon as the vote closes.
- Setting reminders: Use either of the set-...-reminders commands to set reminders. These reminders will ping voters to remind them to cast their vote.

Now you are ready to start your first vote. Use the [/vote-create](./DOCUMENTATION.md#vote-create) command to create a vote. The embed showing the status and voting buttons will be shown in the channel that the command was sent to.

To see all commands, visit the [Documentation](./DOCUMENTATION.md).

## Development & Deployment
### Environment variables
Create an `.env` file with the following variables:
- `BOT_TOKEN`: This is the token the bot uses to log in to discord.
- `DATA_PATH`: Path to the folder that data will be stored; used by the app, may be relative
- (for Docker) `BOT_VERSION`: Used to tag the image
- (for Docker) `VOTE_DATA_FOLDER_PATH` (inside) and `DATA_FOLDER_PATH` (outside): the outside path on the hosts filesystem will be mounted as the inside path in the container

### Prerequisites
A Discord application must be created to house the bot. This can be done through the [Discord Developer Portal](https://discord.com/developers). Once an application is created, generate the token and save it to the `.env` file (environment variable `BOT_TOKEN`). Also retrieve the application id and post it to the first line of the [deploy-commands.js](./deploy-commands.js) file. In the same developer portal you can create an invitation link to invite the bot to your server. While creating the invitation link, choose `bot` and `applications.commands` for scopes and select the following permissions: `Send Messages`, `Send Messages in Threads`, `Read Message History`, `Use Slash Commands`, `Use Embedded Activities` (This should result in a permission enum of `826781272064`). Use the resulting link to invite the bot to servers.

To run the app, Node.js and npm are required. Download and install them (npm should be included with all Node.js installations).

### Installing
Navigate to your source folder and run `npm install`. This installs all required packages.

Run `node --env-file=.env deploy-commands.js` to register the slash commands. It is only required to run this once or when any of the command definitions were changed.

### Running locally
You can start the bot by executing `node --env-file=.env index.js` while in your source folder. When the app is logged in, it will log a message to the command line.

### Running with Docker
- download or clone the repository to the host machine
- create an enviroment variables file and populate it
    - make sure the specified data folder exists on the host machine and is empty
- run `docker compose up -d` to build and launch the app
- run `docker compose down` to stop and delete the app
- run `docker compose start -d` to launch the app in case it has already been built
- run `docker compose stop` to stop the running app without deleting it
