const AWS = require("aws-sdk"),
    STANDARD_ATTRS = ['address','birthdate','email','family_name','gender','given_name','locale','middle_name','name','nickname','phone_number','picture','preferred_username','profile','timezone','updated_at','website']

module.exports = class CognitoUserStore {
    constructor(params) {
        if (!params) throw new Error("Can't initialize with no params.")
        if (!params.poolId) throw new Error("Can't initialize with no poolId")

        this.poolId = params.poolId
    }

    async createUser(params) {
        if (!params) throw new Error("No params")
        if (!params.username) throw new Error("No Username")
        if (!params.userAttributes || (!params.email && !params.userAttributes.email)) throw new Error("No email attribute")

        let attrs,
            identityProvider,
            standardizedUserObject = {}

        // Move email into attrs
        attrs = Array.isArray(params.userAttributes) ? params.userAttributes.slice(0) : [params.userAttributes]
        if (!attrs.find((attr) => {
            return !!attr.email
        })) attrs.push({email: params.email})

        identityProvider = new AWS.CognitoIdentityServiceProvider()
        // userAttrs = [].concat(params.userAttributes)


        return new Promise((resolve, reject) => {
            identityProvider.adminCreateUser({
                DesiredDeliveryMediums: ['EMAIL'],
                Username: params.username,
                UserPoolId: this.poolId,
                UserAttributes: this.normalizeAttrs(attrs)
            }, (err, resp) => {
                if (err) reject(err)

                // Standardize attrs
                standardizedUserObject.username = resp.User.Username
                standardizedUserObject.sub = resp.User.Attributes.find((attr) => {return attr.Name==='sub'}).Value


                resolve(standardizedUserObject)
            })
        })
    }

    async updateAttributes(username, attrs) {
        if (arguments.length < 1) throw new Error("Can't update with no params.")
        if (!arguments[0]) throw new Error("Can't update. No username given.")

        let identityProvider = new AWS.CognitoIdentityServiceProvider()

        identityProvider.adminUpdateUserAttributes({
            UserAttributes: this.normalizeAttrs(attrs),
            UserPoolId: this.poolId,
            Username: username
        }, (err, data) => {
            if (!!err) {
                console.log(err)
            } else {
                console.log(data)
            }
        })
    }

    normalizeAttr(attr) {
        let normalizedAttr = {}

        // Don't restructure attrs that are already normalized
        if (!!attr.Name || !!attr.Value) {
            normalizedAttr.Name = attr.Name
            normalizedAttr.Value = attr.Value
        } else {
            for (let key in attr) {
                normalizedAttr["Name"] = key
                normalizedAttr["Value"] = attr[key]
            }
        }

        // If non standard attribute, ensure 'custom:' prefix
        if(!STANDARD_ATTRS.includes(normalizedAttr.Name) && !normalizedAttr.Name.match(/^custom:/)) {
            normalizedAttr.Name = 'custom:'+ normalizedAttr.Name
        }
        return normalizedAttr
    }

    normalizeAttrs(attrs) {
        //TODO handle case where name and value are present but malformed

        // Array-ize
        if (!Array.isArray(attrs)) attrs = [attrs]
        // Return empty array
        if (attrs.length < 1) return attrs

        let self = this,
            normalizedAttrs = []

        attrs.forEach((attr) => {
            // If attr is normal, don't break it apart.
            if (!!attr.Name && !!attr.Value) normalizedAttrs.push(self.normalizeAttr(attr))
            else {
                for (const key in attr) {
                    let singleAttr = {}
                    singleAttr[key] = attr[key]
                    normalizedAttrs.push(self.normalizeAttr(singleAttr))
                }
            }
        })

        return normalizedAttrs
    }

}