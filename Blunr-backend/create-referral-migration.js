#!/usr/bin/env node

/**
 * Migration Script: Create Referral Records for Existing Users
 * Run with: node create-referral-migration.js
 */

import dotenv from 'dotenv';
import connectDB from './src/config/db.js';
import User from './src/modules/user/user.model.js';
import Referral from './src/modules/referrals/referral.model.js';

dotenv.config();

async function createReferralRecordsForExistingUsers() {
    try {
        console.log('🔌 Connecting to database...');
        await connectDB();
        
        console.log('👥 Finding users without referral records...');
        
        // Get all users
        const allUsers = await User.find().select('_id username email');
        console.log(`Found ${allUsers.length} total users`);
        
        // Get users with existing referral records
        const usersWithReferrals = await Referral.find().distinct('codeOwner');
        console.log(`Found ${usersWithReferrals.length} users with existing referral records`);
        
        // Find users without referral records
        const usersNeedingReferrals = allUsers.filter(
            user => !usersWithReferrals.some(id => id.toString() === user._id.toString())
        );
        
        console.log(`Found ${usersNeedingReferrals.length} users needing referral records`);
        
        if (usersNeedingReferrals.length === 0) {
            console.log('✅ All users already have referral records!');
            process.exit(0);
        }
        
        console.log('📝 Creating referral records...');
        let created = 0;
        let errors = 0;
        
        for (const user of usersNeedingReferrals) {
            try {
                const baseString = user.username || user.email.split('@')[0];
                const code = await Referral.generateReferralCode(baseString);
                
                const newReferral = new Referral({
                    code,
                    codeOwner: user._id,
                    source: 'migration'
                });
                
                await newReferral.save();
                created++;
                
                if (created % 10 === 0) {
                    console.log(`   Progress: ${created}/${usersNeedingReferrals.length} users processed`);
                }
            } catch (error) {
                console.error(`   ❌ Error creating referral for user ${user._id}:`, error.message);
                errors++;
            }
        }
        
        console.log('\n🎉 Migration completed!');
        console.log(`✅ Created referral records: ${created}`);
        console.log(`❌ Errors: ${errors}`);
        console.log(`📊 Total users: ${allUsers.length}`);
        console.log(`📋 Users with referrals: ${usersWithReferrals.length + created}`);
        
        // Verify
        const finalCount = await Referral.countDocuments();
        console.log(`🔍 Final referral record count: ${finalCount}`);
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        process.exit(0);
    }
}

createReferralRecordsForExistingUsers();