// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from 'antd/lib/modal';

import { useSelector, useDispatch } from 'react-redux';
import { CombinedState } from 'reducers';

import { Organization } from 'cvat-core-wrapper';
import { organizationActions } from 'actions/organization-actions';
import OrganizationSelector from 'components/selectors/organization-selector';

function SelectOrganizationModal(): JSX.Element {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const visible = useSelector((state: CombinedState) => state.organizations.selectModal.visible);
    const onSelectCallback = useSelector(
        (state: CombinedState) => state.organizations.selectModal.onSelectCallback,
    );

    return (
        <Modal
            title={t('selectOrganization')}
            open={visible}
            footer={null}
            onCancel={() => dispatch(organizationActions.closeSelectOrganizationModal())}
        >
            <OrganizationSelector
                setNewOrganization={(org: Organization | null) => {
                    if (onSelectCallback) {
                        onSelectCallback(org);
                    }
                    dispatch(organizationActions.closeSelectOrganizationModal());
                }}
            />
        </Modal>
    );
}

export default React.memo(SelectOrganizationModal);
