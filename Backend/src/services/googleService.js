const GoogleUser = require("../../models/GoogleUser");

const findOrCreateGoogleUser = async (profile) => {
    const googleId = profile.sub;

    let user = await GoogleUser.findOne({
        googleId
    });

    if (user) {
        return {
            user,
            created: false
        }
    };

    user = await GoogleUser.create({
        googleId,
        email: profile.email,
        name: profile.name || "",
        emailVerified: profile.email_verified === true
    });

    return {
        user,
        created: true
    }
};

module.exports ={
    findOrCreateGoogleUser
}