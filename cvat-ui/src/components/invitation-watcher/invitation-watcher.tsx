// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import { CombinedState } from 'reducers';

function InvitationWatcher(): JSX.Element | null {
    const { user, initialized } = useSelector((state: CombinedState) => state.auth);
    const history = useHistory();

    useEffect(() => {
        console.log('InvitationWatcher useEffect: initialized=', initialized, 'user=', user);
        // Do not run this logic until auth state is initialized
        if (!initialized) {
            console.log('InvitationWatcher: Not initialized, returning.');
            return;
        }

        const queryParams = new URLSearchParams(history.location.search);
        const invitationKey = queryParams.get('invitation');
        console.log('InvitationWatcher: Found invitation key? ->', invitationKey);

        if (invitationKey) {
            // If user is not logged in, redirect to confirmation page
            if (!user) {
                console.log('InvitationWatcher: User not logged in, redirecting to /auth/invitation/confirm');
                history.replace(`/auth/invitation/confirm?invitation=${invitationKey}`);
                return; // Stop further processing
            }

            // If user is logged in, save to local storage and redirect to invitations page
            console.log('InvitationWatcher: User is logged in, redirecting to /invitations');
            localStorage.setItem('newInvitation', invitationKey);
            history.push('/invitations');
        } else if (user && localStorage.getItem('newInvitation')) {
            // Handle case where user logs in on a different page after visiting the link
            const newInvitation = localStorage.getItem('newInvitation');
            if (newInvitation) {
                localStorage.removeItem('newInvitation');
                history.push('/tasks');
            }
        }
    }, [user, initialized, history]);

    return null;
}

export default React.memo(InvitationWatcher);
