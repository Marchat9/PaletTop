import { AddTrainingMemberDto } from './add-training-member.dto';

// Same rules as on creation: admin password, trimmed name, not empty, 100 characters at most.
export class RenameTrainingMemberDto extends AddTrainingMemberDto {}
