process.env.ELECTRON_OZONE_PLATFORM_HINT = process.env.ELECTRON_OZONE_PLATFORM_HINT || 'auto';
const { app } = require('electron');
app.commandLine.appendSwitch('ozone-platform', 'wayland');
require('./main');