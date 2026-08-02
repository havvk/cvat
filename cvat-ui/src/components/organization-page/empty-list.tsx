// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useTranslation } from 'react-i18next';
import Text from 'antd/lib/typography/Text';
import Empty from 'antd/lib/empty';

function EmptyListComponent(): JSX.Element {
    const { t } = useTranslation();
    return (
        <div className='cvat-empty-members-list'>
            <Empty description={<Text strong>{t('noSearchResults')}</Text>} />
        </div>
    );
}

export default React.memo(EmptyListComponent);
