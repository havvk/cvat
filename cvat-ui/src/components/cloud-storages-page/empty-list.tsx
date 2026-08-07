// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import Empty from 'antd/lib/empty';
import { Row, Col } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import { CloudOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface Props {
    notFound: boolean;
}

export default function EmptyListComponent(props: Props): JSX.Element {
    const { notFound } = props;
    const { t } = useTranslation();

    return (
        <div className='cvat-empty-cloud-storages-list'>
            <Empty
                description={notFound ? (
                    <Text strong>{t('noResultsMatchedYourSearch')}</Text>
                ) : (
                    <>
                        <Row justify='center' align='middle'>
                            <Col>
                                <Text strong>{t('noCloudStoragesAttachedYet')}</Text>
                            </Col>
                        </Row>
                        <Row justify='center' align='middle'>
                            <Col>
                                <Text type='secondary'>{t('getStartedWithCloudStorage')}</Text>
                            </Col>
                        </Row>
                        <Row justify='center' align='middle'>
                            <Col>
                                <Link to='/cloudstorages/create'>{t('attachANewOne')}</Link>
                            </Col>
                        </Row>
                    </>
                )}
                image={notFound ? Empty.PRESENTED_IMAGE_DEFAULT : <CloudOutlined className='cvat-empty-cloud-storages-list-icon' />}
            />
        </div>
    );
}