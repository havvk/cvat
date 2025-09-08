// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useState, useRef, useEffect, useCallback,
} from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import moment from 'moment';
import { Row, Col } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import Modal from 'antd/lib/modal';
import Button from 'antd/lib/button';
import Space from 'antd/lib/space';
import Input from 'antd/lib/input';
import Dropdown from 'antd/lib/dropdown';
import { Store } from 'antd/lib/form/interface';
import {
    EditTwoTone, EnvironmentOutlined,
    MailOutlined, PhoneOutlined, PlusCircleOutlined, MoreOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

import {
    inviteOrganizationMembersAsync,
    leaveOrganizationAsync,
    removeOrganizationAsync,
    updateOrganizationAsync,
} from 'actions/organization-actions';
import { OrganizationMembersQuery, CombinedState } from 'reducers';
import { Organization, User } from 'cvat-core-wrapper';
import {
    SortingComponent,
    ResourceFilterHOC,
    defaultVisibility,
    ResourceSelectionInfo,
} from 'components/resource-sorting-filtering';

import InvitationModal from './invitation-modal';

import {
    localStorageRecentKeyword, localStorageRecentCapacity, predefinedFilterValues, config,
} from './memberships-filter-configuration';

export interface Props {
    organizationInstance: Organization;
    userInstance: User;
    query: OrganizationMembersQuery;
    fetchMembers: () => void;
    onApplySearch: (search: string | null) => void;
    onApplyFilter: (filter: string | null) => void;
    onApplySorting: (sort: string | null) => void;
    selectedCount: number;
    onSelectAll: () => void;
}

export enum MenuActions {
    SET_WEBHOOKS = 'SET_WEBHOOKS',
    REMOVE_ORGANIZATION = 'REMOVE_ORGANIZATION',
}

const FilteringComponent = ResourceFilterHOC(
    config, localStorageRecentKeyword, localStorageRecentCapacity, predefinedFilterValues,
);

function OrganizationTopBar(props: Readonly<Props>): JSX.Element {
    const { t } = useTranslation();
    const { 
        organizationInstance, userInstance, fetchMembers, query,
        onApplyFilter, onApplySearch, onApplySorting, selectedCount, onSelectAll,
    } = props;
    const { 
        owner, createdDate, description, updatedDate, slug, name, contact,
    } = organizationInstance;
    const { id: userID } = userInstance;
    const descriptionEditingRef = useRef<HTMLDivElement>(null);
    const [editingDescription, setEditingDescription] = useState(false);
    const [visibleInviteModal, setVisibleInviteModal] = useState(false);
    const [visibility, setVisibility] = useState(defaultVisibility);
    const dispatch = useDispatch();

    const onInvite = useCallback((values: Store) => {
        dispatch(inviteOrganizationMembersAsync(organizationInstance, values.users, () => {
            fetchMembers();
        }));
        setVisibleInviteModal(false);
    }, [organizationInstance, fetchMembers]);
    const onCancelInvite = useCallback(() => {
        setVisibleInviteModal(false);
    }, []);

    useEffect(() => {
        const listener = (event: MouseEvent): void => {
            const divElement = descriptionEditingRef.current;
            if (editingDescription && divElement && !event.composedPath().includes(divElement)) {
                setEditingDescription(false);
            }
        };

        window.addEventListener('mousedown', listener);
        return () => {
            window.removeEventListener('mousedown', listener);
        };
    });

    const onRemove = (): void => {
        const modal = Modal.confirm({
            onOk: () => {
                dispatch(removeOrganizationAsync(organizationInstance));
            },
            content: (
                <div className='cvat-remove-organization-submit'>
                    <Text type='warning'>
                        To remove the organization,
                        enter its short name below
                    </Text>
                    <Input
                        onChange={
                            (event: React.ChangeEvent<HTMLInputElement>) => {
                                modal.update({
                                    okButtonProps: {
                                        disabled: event.target.value !== organizationInstance.slug,
                                        danger: true,
                                    },
                                });
                            }
                        }
                    />
                </div>
            ),
            okButtonProps: {
                disabled: true,
                danger: true,
            },
            okText: t('Remove'),
        });
    };

    let organizationName = name;
    let organizationDescription = description;
    let organizationContacts = contact;

    return (
        <>
            <Row justify='space-between'>
                <Col span={24}>
                    <div className='cvat-organization-top-bar-descriptions'>
                        <Row justify='space-between'>
                            <Col>
                                <Text>
                                    <Text className='cvat-title'>{t('organizationSlug', { slug })}</Text>
                                </Text>
                            </Col>
                            <Col>
                                <Dropdown
                                    menu={{
                                        items: [
                                            {
                                                key: MenuActions.SET_WEBHOOKS,
                                                label: <Link to='/organization/webhooks'>{t('Setup webhooks')}</Link>,
                                            },
                                            ...(owner && userID === owner.id ? [{
                                                type: 'divider' as const,
                                            }, {
                                                key: MenuActions.REMOVE_ORGANIZATION,
                                                onClick: onRemove,
                                                label: t('removeOrganization'),
                                            }] : []),
                                        ],
                                        className: 'cvat-organization-actions-menu',
                                    }}
                                    trigger={['click']}
                                >
                                    <Button size='middle' className='cvat-organization-page-actions-button'>
                                        <Text className='cvat-text-color'>{t('Actions')}</Text>
                                        <MoreOutlined className='cvat-menu-icon' />
                                    </Button>
                                </Dropdown>
                            </Col>
                        </Row>
                        <Text
                            editable={{
                                onChange: (value: string) => {
                                    organizationName = value;
                                },
                                onEnd: () => {
                                    organizationInstance.name = organizationName;
                                    dispatch(updateOrganizationAsync(organizationInstance));
                                },
                            }}
                            type='secondary'
                        >
                            {name}
                        </Text>
                        {!editingDescription ? (
                            <span style={{ display: 'grid' }}>
                                {(description || t('addDescription')).split('\n').map((val: string, idx: number) => (
                                    <Text key={idx} type='secondary'>
                                        {val}
                                        {idx === 0 ? <EditTwoTone onClick={() => setEditingDescription(true)} /> : null}
                                    </Text>
                                ))}
                            </span>
                        ) : (
                            <div ref={descriptionEditingRef}>
                                <Input.TextArea
                                    defaultValue={description}
                                    onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
                                        organizationDescription = event.target.value;
                                    }}
                                />
                                <Button
                                    className='cvat-submit-new-org-description-button'
                                    size='small'
                                    type='primary'
                                    onClick={() => {
                                        if (organizationDescription !== description) {
                                            organizationInstance.description = organizationDescription;
                                            dispatch(updateOrganizationAsync(organizationInstance));
                                        }
                                        setEditingDescription(false);
                                    }}
                                >
                                    {t('Submit')}
                                </Button>
                            </div>
                        )}
                    </div>
                </Col>
                <Col span={12}>
                    <div className='cvat-organization-top-bar-contacts'>
                        <div>
                            <PhoneOutlined />
                            { !contact.phoneNumber ? <Text type='secondary'>{t('addPhoneNumber')}</Text> : null }
                            <Text
                                type='secondary'
                                editable={{
                                    onChange: (value: string) => {
                                        organizationContacts = {
                                            ...organizationInstance.contact, phoneNumber: value,
                                        };
                                    },
                                    onEnd: () => {
                                        organizationInstance.contact = organizationContacts;
                                        dispatch(updateOrganizationAsync(organizationInstance));
                                    },
                                }}
                            >
                                {contact.phoneNumber}
                            </Text>
                        </div>
                        <div>
                            <MailOutlined />
                            { !contact.email ? <Text type='secondary'>{t('addEmail')}</Text> : null }
                            <Text
                                type='secondary'
                                editable={{
                                    onChange: (value: string) => {
                                        organizationContacts = {
                                            ...organizationInstance.contact, email: value,
                                        };
                                    },
                                    onEnd: () => {
                                        organizationInstance.contact = organizationContacts;
                                        dispatch(updateOrganizationAsync(organizationInstance));
                                    },
                                }}
                            >
                                {contact.email}
                            </Text>
                        </div>
                        <div>
                            <EnvironmentOutlined />
                            { !contact.location ? <Text type='secondary'>{t('addLocation')}</Text> : null }
                            <Text
                                type='secondary'
                                editable={{
                                    onChange: (value: string) => {
                                        organizationContacts = {
                                            ...organizationInstance.contact, location: value,
                                        };
                                    },
                                    onEnd: () => {
                                        organizationInstance.contact = organizationContacts;
                                        dispatch(updateOrganizationAsync(organizationInstance));
                                    },
                                }}
                            >
                                {contact.location}
                            </Text>
                        </div>
                        <Text type='secondary'>{t('createdOn', { date: moment(createdDate).format('MMMM Do YYYY') })}</Text>
                        <Text type='secondary'>{t('updatedOn', { date: moment(updatedDate).fromNow() })}</Text>
                    </div>
                </Col>
                <Col span={12} className='cvat-organization-top-bar-buttons-block'>
                    <Space align='end'>
                        {!(owner && userID === owner.id) ? (
                            <Button
                                className='cvat-leave-org-button'
                                type='primary'
                                danger
                                onClick={() => {
                                    Modal.confirm({
                                        onOk: () => {
                                            dispatch(leaveOrganizationAsync(organizationInstance, () => {
                                                localStorage.removeItem('currentOrganization');
                                                window.location.reload();
                                            }));
                                        },
                                        className: 'cvat-modal-organization-leave-confirm',
                                        content: (
                                            <>
                                                <Text>{t('confirmLeavingOrganization')}</Text>
                                                <Text strong>{` ${organizationInstance.slug}`}</Text>
                                                <Text>{t('noAccessToOrganizationData')}</Text>
                                            </>
                                        ),
                                        okText: t('leave'),
                                        okButtonProps: {
                                            danger: true,
                                        },
                                    });
                                }}
                            >
                                {t('leaveOrganization')}
                            </Button>
                        ) : null}
                        <Button
                            className='cvat-invite-org-members-button'
                            type='primary'
                            onClick={() => setVisibleInviteModal(true)}
                            icon={<PlusCircleOutlined />}
                        >
                            {t('inviteMembers')}
                        </Button>
                    </Space>
                </Col>
            </Row>
            <Row className='cvat-organization-page-filters-wrapper' justify='space-between'>
                <Col>
                    <Input.Search
                        enterButton
                        onSearch={(phrase: string) => {
                            onApplySearch(phrase);
                        }}
                        defaultValue={query.search ?? ''}
                        className='cvat-organization-page-search-bar'
                        placeholder={t('Search ...')}
                    />
                    <ResourceSelectionInfo selectedCount={selectedCount} onSelectAll={onSelectAll} />
                </Col>
                <Col>
                    <SortingComponent
                        visible={visibility.sorting}
                        onVisibleChange={(visible: boolean) => (
                            setVisibility({ ...defaultVisibility, sorting: visible })
                        )}
                        defaultFields={query.sort?.split(',') || ['-ID']}
                        sortingFields={[t('user'), t('role')]}
                        onApplySorting={onApplySorting}
                    />
                    <FilteringComponent
                        value={query.filter}
                        predefinedVisible={visibility.predefined}
                        builderVisible={visibility.builder}
                        recentVisible={visibility.recent}
                        onPredefinedVisibleChange={(visible: boolean) => (
                            setVisibility({ ...defaultVisibility, predefined: visible })
                        )}
                        onBuilderVisibleChange={(visible: boolean) => (
                            setVisibility({ ...defaultVisibility, builder: visible })
                        )}
                        onRecentVisibleChange={(visible: boolean) => (
                            setVisibility({
                                ...defaultVisibility, builder: visibility.builder, recent: visible,
                            })
                        )}
                        onApplyFilter={onApplyFilter}
                    />
                </Col>
            </Row>
            {
                visibleInviteModal && (
                    <InvitationModal
                        onInvite={onInvite}
                        onCancelInvite={onCancelInvite}
                    />
                )
            }

        </>
    );
}

export default React.memo(OrganizationTopBar);