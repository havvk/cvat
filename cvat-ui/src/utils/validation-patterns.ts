// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import i18n from 'i18next';

const validationPatterns = {
    get validatePasswordLength() {
        return {
            pattern: /(?=.{8,})/,
            message: i18n.t('validationMessages.passwordLength'),
        };
    },

    get passwordContainsNumericCharacters() {
        return {
            pattern: /(?=.*[0-9])/,
            message: i18n.t('validationMessages.passwordNumeric'),
        };
    },

    get passwordContainsUpperCaseCharacter() {
        return {
            pattern: /(?=.*[A-Z])/,
            message: i18n.t('validationMessages.passwordUppercase'),
        };
    },

    get passwordContainsLowerCaseCharacter() {
        return {
            pattern: /(?=.*[a-z])/,
            message: i18n.t('validationMessages.passwordLowercase'),
        };
    },

    get validateUsernameLength() {
        return {
            pattern: /(?=.{5,})/,
            message: i18n.t('validationMessages.usernameLength'),
        };
    },

    get validateUsernameCharacters() {
        return {
            pattern: /^[a-zA-Z0-9_\-.]{5,}$/,
            message: i18n.t('validationMessages.usernameCharacters'),
        };
    },

    /*
        \p{Pd} - dash connectors
        \p{Pc} - connector punctuations
        \p{Cf} - invisible formatting indicator
        \p{L} - any alphabetic character
        Useful links:
        https://stackoverflow.com/questions/4323386/multi-language-input-validation-with-utf-8-encoding
        https://stackoverflow.com/questions/280712/javascript-unicode-regexes
        https://stackoverflow.com/questions/6377407/how-to-validate-both-chinese-unicode-and-english-name
    */
    get validateName() {
        return {
            // eslint-disable-next-line
            pattern: /^(\p{L}|\p{Pd}|\p{Cf}|\p{Pc}|['\s]){2,}$/gu,
            message: i18n.t('validationMessages.invalidName'),
        };
    },

    get validateAttributeName() {
        return {
            pattern: /\S+/,
            message: i18n.t('validationMessages.invalidName'),
        };
    },

    get validateLabelName() {
        return {
            pattern: /\S+/,
            message: i18n.t('validationMessages.invalidName'),
        };
    },

    get validateAttributeValue() {
        return {
            pattern: /\S+/,
            message: i18n.t('validationMessages.invalidAttributeValue'),
        };
    },

    get validateURL() {
        return {
            // eslint-disable-next-line
            pattern: /^(https?:\/\/)[^\s$.?#].[^\s]*$/, // url, ip
            message: i18n.t('validationMessages.invalidURL'),
        };
    },

    get validateOrganizationSlug() {
        return {
            pattern: /^[a-zA-Z\d]+$/,
            message: i18n.t('validationMessages.organizationSlug'),
        };
    },

    get validatePhoneNumber() {
        return {
            pattern: /^[+]*[-\s0-9]*$/g,
            message: i18n.t('validationMessages.invalidPhoneNumber'),
        };
    },
};

export default validationPatterns;
