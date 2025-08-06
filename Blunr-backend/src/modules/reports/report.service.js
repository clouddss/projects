import Report from './report.model.js';

export const createReport = async (reportedBy, reportedUser, reportedPost, reason) => {
    if (!reportedUser && !reportedPost) {
        throw new Error('Either a reportedUser or reportedPost must be provided.');
    }

    const report = await Report.create({
        reportedBy,
        reportedUser,
        reportedPost,
        reason,
    });

    return report;
};

export const getAllReports = async (page = 1, limit = 10) => {
    const skip = (page - 1) * limit;

    const reports = await Report.find()
        .populate('reportedBy', 'username name avatar isNSFW')
        .populate('reportedUser', 'username name avatar isNSFW')
        .populate('reportedPost', 'caption media isNSFW')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const totalReports = await Report.countDocuments();
    
    return {
        totalReports,
        totalPages: Math.ceil(totalReports / limit),
        currentPage: page,
        reports,
    };
};


export const updateReportStatus = async (reportId, status) => {
    if (!['pending', 'resolved', 'dismissed'].includes(status)) {
        throw new Error('Invalid status value');
    }

    return await Report.findByIdAndUpdate(reportId, { status }, { new: true });
};
