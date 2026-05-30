// Language-related SQL queries

exports.GET_LANGUAGE_INFO = `
SELECT *
FROM languages l
WHERE l.lid = $1
`;

exports.GET_LANGUAGES = `
SELECT *
FROM languages l
`;

exports.DELETE_LANGUAGE = `
    DELETE FROM languages 
    WHERE lid = $1;
`;

exports.ADD_LANGUAGE = `
INSERT INTO "languages" ("language_name", "uid") 
    VALUES ($1, $2) 
    RETURNING "lid";
`;

// Submission-related SQL queries

exports.GET_AVAILABLE_SUBMISSIONS = `
SELECT
    s.sid,
    s.submission_name,
    s.uid,
    s.readings_file,
    array_agg(sd.sign) AS signs
FROM submissions s
LEFT JOIN submissions_data sd ON sd.sid = s.sid
WHERE s.lid = $1
AND s.sid NOT IN (
    SELECT sid FROM model_submissions WHERE mid = $2
)
GROUP BY s.sid;
`;

exports.GET_LANGUAGE_SUBMISSIONS = `
SELECT
    s.sid,
    s.submission_name,
    s.uid,
    s.readings_file,
    array_agg(sd.sign) AS signs
FROM submissions s
LEFT JOIN submissions_data sd ON sd.sid = s.sid
WHERE s.lid = $1
GROUP BY s.sid;
`;

exports.DELETE_SUBMISSION = `
    DELETE FROM submissions 
    WHERE sid = $1;
`;

exports.GET_MULTIPLE_SUBMISSIONS_DETAILS = `
    SELECT sid, readings_file, submission_name 
    FROM submissions 
    WHERE sid = ANY($1::int[]);
`;

exports.INSERT_SUBMISSION = `
    INSERT INTO "submissions" ("uid", "lid", "submission_name", "readings_file") 
    VALUES ($1, $2, $3, $4) 
    RETURNING "sid";
`;

exports.ADD_SUBMISSIONS_DATA = `
    INSERT INTO "submissions_data" ("sid", "sign") 
    VALUES ($1, $2);`;

exports.ADD_LANGUAGE_SUBMISSIONS =`
    INSERT INTO "language_submissions" ("lid", "sid")
    VALUES ($1, $2);
`;

exports.DELETE_DUPLICATES = `
    DELETE FROM submissions_data
    WHERE sid = ANY($1::int[])
    AND (sid, sign) NOT IN (
        SELECT MIN(sid), sign
        FROM submissions_data
        WHERE sid = ANY($1::int[])
        GROUP BY sign
    )
`;

exports.UPDATE_JUNCTION_DATA = `
    UPDATE submissions_data
    SET sid = $1::int
    WHERE sid = ANY($2::int[])
`;

exports.UPDATE_MODEL_LINKS = `
    INSERT INTO "model_submissions" ("mid", "sid")
    SELECT DISTINCT "mid", $1 ::int
    FROM "model_submissions" 
    WHERE "sid" = ANY($2::int[])
    ON CONFLICT DO NOTHING;
`;

exports.DELETE_MULTIPLE_SUBMISSIONS = `
    DELETE FROM "submissions" 
    WHERE "sid" = ANY($1::int[]);
`;

// Model-related SQL queries

exports.GET_MODEL_BRIEF = `
SELECT l.lid, l.language_name AS language_name, m.model_name AS model_name
FROM models m
JOIN languages l ON m.lid = l.lid
WHERE m.mid = $1
`;

exports.GET_MODEL_FILE_BY_ID = `
  SELECT model_file
  FROM models
  WHERE mid = $1
`;

exports.ADD_MODEL = `
    INSERT INTO "models" ("uid", "lid", "base_mid", "model_name", "model_file")
    VALUES ($1, $2, $3, $4, $5)
    RETURNING "mid";
`;

exports.GET_MODELs = `
SELECT m.mid AS mid, m.uid AS uid, m.model_name AS model_name, m.model_file AS model_file, l.language_name AS language_name
FROM models m
JOIN languages l ON m.lid = l.lid
WHERE ($1::int IS NULL OR m.lid = $1)
`;

exports.DELETE_MODEL = `
    DELETE FROM models 
    WHERE mid = $1;
`;

// Profile-related SQL queries

exports.GET_PROFILE_INFO = `
SELECT username, initials
FROM profiles
WHERE id = $1
`;

//Room-related SQL queries

exports.CREATE_ROOM = `
    INSERT INTO rooms ("uid", "lid") 
    VALUES ($1, $2) 
    RETURNING "rid";
`;

exports.CLOSE_ROOM = `
    UPDATE rooms 
    SET "is_active" = false 
    WHERE "rid" = $1 AND "uid" = $2;
`;

exports.GET_ROOM_STATUS = `
    SELECT "is_active", "lid" FROM rooms WHERE "rid" = $1;
`;
