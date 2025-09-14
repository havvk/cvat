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
        // Do not run this logic until auth state is initialized
        if (!initialized) {
            return;
        }

        const queryParams = new URLSearchParams(history.location.search);
        const invitationKey = queryParams.get('invitation');

        if (invitationKey) {
            // If user is not logged in, redirect to confirmation page
            if (!user) {
                history.replace(`/auth/invitation/confirm?invitation=${invitationKey}`);
                return; // Stop further processing
            }

            // If user is logged in, save to local storage and redirect to invitations page
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
