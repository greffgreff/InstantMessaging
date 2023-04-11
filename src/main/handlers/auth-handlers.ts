import { ipcMain } from 'electron'
import { channels } from '../../common/constants'
import { Registration, Credentials } from '../../common/types'
import { authentication, window } from '../main'

ipcMain.on(channels.REGISTER, async (event, registration: Registration) => {
	try {
		await authentication.register(registration)
	} catch (error) {
		event.sender.send(channels.REGISTRATION_ERROR, error.message)
	}
})

ipcMain.on(channels.LOGIN, async (event, credentials: Credentials) => {
	try {
		await authentication.login(credentials)
	} catch (error) {
		event.sender.send(channels.LOGIN_ERROR, error.message)
	}
})

ipcMain.on(channels.LOGOUT, (event) => {
	try {
		authentication.logout()
	} catch (error) {
		event.sender.send(channels.LOGOUT_ERROR, error.message)
	}
})

ipcMain.handle(channels.AUTHENTICATION_STATUS, async () => {
	if (!(await authentication.isRegistered())) {
		return 'notRegistered'
	} else if (authentication.isAuthenticated()) {
		return 'loggedIn'
	} else {
		return 'loggedOut'
	}
})

export function notifyOfAuthState(state: 'notRegistered' | 'loggedOut' | 'loggedIn') {
	window.webContents.send(channels.AUTHENTICATION_STATUS, state)
}
