const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config({ path: './Blunr-backend/.env' });

// Import referral model (using require for CommonJS compatibility)
const ReferralSchema = new mongoose.Schema({
    code: { type: String, unique: true, required: true, uppercase: true, minlength: 6, maxlength: 12 },
    codeOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    directReferrals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    tier1Referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    tier2Referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    stats: {
        totalReferrals: { type: Number, default: 0 },
        activeReferrals: { type: Number, default: 0 },
        totalCommissionEarned: { type: Number, default: 0 },
        tier1CommissionEarned: { type: Number, default: 0 },
        tier2CommissionEarned: { type: Number, default: 0 },
        lastActivity: { type: Date, default: Date.now }
    },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date, default: null },
    source: { type: String, enum: ['organic', 'campaign', 'influencer', 'partner', 'migration', 'referral'], default: 'organic' },
    campaign: { type: String, default: null }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

const Referral = mongoose.model('Referral', ReferralSchema);

async function fixReferralTiers() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Get all referral records
        const allReferrals = await Referral.find({}).populate('directReferrals', '_id username');
        
        console.log(`Found ${allReferrals.length} referral records`);
        
        // Process each referral record to establish tier relationships
        let fixed = 0;
        
        for (const referralRecord of allReferrals) {
            console.log(`\nProcessing referral for user ${referralRecord.codeOwner}`);
            console.log(`Code: ${referralRecord.code}`);
            console.log(`Direct referrals: ${referralRecord.directReferrals.length}`);
            
            // For each user in this referral's directReferrals array,
            // make sure their referral record has proper tier relationships
            for (const directReferralUserId of referralRecord.directReferrals) {
                const directReferralRecord = await Referral.findOne({ 
                    codeOwner: directReferralUserId 
                });
                
                if (directReferralRecord) {
                    let needsUpdate = false;
                    
                    // Set tier1Referrer to the current referral owner
                    if (!directReferralRecord.tier1Referrer || 
                        directReferralRecord.tier1Referrer.toString() !== referralRecord.codeOwner.toString()) {
                        directReferralRecord.tier1Referrer = referralRecord.codeOwner;
                        needsUpdate = true;
                        console.log(`  Setting tier1Referrer for ${directReferralUserId} to ${referralRecord.codeOwner}`);
                    }
                    
                    // Set tier2Referrer to the referral owner's tier1Referrer (if exists)
                    if (referralRecord.tier1Referrer && 
                        (!directReferralRecord.tier2Referrer || 
                         directReferralRecord.tier2Referrer.toString() !== referralRecord.tier1Referrer.toString())) {
                        directReferralRecord.tier2Referrer = referralRecord.tier1Referrer;
                        needsUpdate = true;
                        console.log(`  Setting tier2Referrer for ${directReferralUserId} to ${referralRecord.tier1Referrer}`);
                    }
                    
                    if (needsUpdate) {
                        await directReferralRecord.save();
                        fixed++;
                        console.log(`  ✅ Updated referral record for ${directReferralUserId}`);
                    } else {
                        console.log(`  ⏭️  Referral record for ${directReferralUserId} already correct`);
                    }
                } else {
                    console.log(`  ❌ No referral record found for direct referral ${directReferralUserId}`);
                }
            }
        }
        
        console.log(`\n🎉 Fixed ${fixed} referral records`);
        
        // Now let's verify the tier relationships
        console.log('\n=== VERIFICATION ===');
        const yourUserId = '688f59122fb8a3d93d0f2131'; // Your user ID from logs
        const yourReferral = await Referral.findOne({ codeOwner: yourUserId });
        
        if (yourReferral) {
            console.log(`Your referral code: ${yourReferral.code}`);
            console.log(`Your direct referrals: ${yourReferral.directReferrals.length}`);
            
            // Check if any of your direct referrals have referred others
            for (const directUserId of yourReferral.directReferrals) {
                const directUserReferral = await Referral.findOne({ codeOwner: directUserId });
                if (directUserReferral && directUserReferral.directReferrals.length > 0) {
                    console.log(`\n📈 Your direct referral ${directUserId} has referred ${directUserReferral.directReferrals.length} users:`);
                    
                    // These should be your tier 2 referrals
                    for (const tier2UserId of directUserReferral.directReferrals) {
                        const tier2Record = await Referral.findOne({ codeOwner: tier2UserId });
                        if (tier2Record) {
                            console.log(`  - User ${tier2UserId}:`);
                            console.log(`    tier1Referrer: ${tier2Record.tier1Referrer}`);
                            console.log(`    tier2Referrer: ${tier2Record.tier2Referrer} ${tier2Record.tier2Referrer?.toString() === yourUserId ? '(YOU!)' : ''}`);
                        }
                    }
                }
            }
        }
        
    } catch (error) {
        console.error('Error fixing referral tiers:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

// Run the fix
fixReferralTiers();