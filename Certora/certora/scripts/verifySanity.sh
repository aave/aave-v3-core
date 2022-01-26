contractPath=${1}
project=${2}
contract=`echo ${1} | perl -0777 -pe 's/.*\///g' | awk -F'.' '{print $1}'`
echo $contractPath
echo $contract
set -x
certoraRun ${contractPath} \
  --solc solc8.10 \
  --verify ${contract}:certora/specs/sanity.spec \
  --settings -t=300 \
  --staging --msg "${project} ${contract} Sanity" --rule sanity
